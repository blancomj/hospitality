import mysql from 'mysql2/promise';
import dns from 'dns';
import { promisify } from 'util';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dnsLookup = promisify(dns.lookup);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Divide un archivo .sql en sentencias ejecutables.
 *
 * IMPORTANTE: `DELIMITER` es una directiva del cliente de línea de comandos
 * `mysql`, no una sentencia SQL. El servidor la rechaza. Como mysql2 envía el
 * texto tal cual, toda migración con `DELIMITER //` (es decir, las 18 que
 * crean procedimientos o funciones) fallaba al ejecutarse desde aquí.
 *
 * Esta función interpreta la directiva del lado del cliente, igual que hace el
 * CLI de mysql, y devuelve sentencias individuales listas para `query()`.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let delimiter = ';';
  let buffer = '';

  // Hay que ignorar delimitadores que aparezcan dentro de cadenas o
  // comentarios (por ejemplo un ';' dentro de un MESSAGE_TEXT).
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) statements.push(trimmed);
    buffer = '';
  };

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]!;
    const next = sql[i + 1];
    const inString = inSingle || inDouble || inBacktick;

    if (inLineComment) {
      buffer += char;
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      buffer += char;
      if (char === '*' && next === '/') {
        buffer += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (!inString) {
      if ((char === '-' && next === '-') || char === '#') {
        inLineComment = true;
        buffer += char;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        buffer += char;
        continue;
      }
    }

    if (!inDouble && !inBacktick && char === "'" && sql[i - 1] !== '\\') {
      inSingle = !inSingle;
      buffer += char;
      continue;
    }
    if (!inSingle && !inBacktick && char === '"' && sql[i - 1] !== '\\') {
      inDouble = !inDouble;
      buffer += char;
      continue;
    }
    if (!inSingle && !inDouble && char === '`') {
      inBacktick = !inBacktick;
      buffer += char;
      continue;
    }
    if (inSingle || inDouble || inBacktick) {
      buffer += char;
      continue;
    }

    // Directiva DELIMITER, sólo válida al inicio de una línea.
    const atLineStart = buffer.length === 0 || buffer.endsWith('\n');
    if (atLineStart && /^delimiter[ \t]/i.test(sql.slice(i, i + 11))) {
      const lineEnd = sql.indexOf('\n', i);
      const line = sql.slice(i, lineEnd === -1 ? sql.length : lineEnd);
      const newDelimiter = line.slice('delimiter'.length).trim();
      if (newDelimiter) {
        flush();
        delimiter = newDelimiter;
      }
      i = lineEnd === -1 ? sql.length : lineEnd;
      continue;
    }

    if (sql.startsWith(delimiter, i)) {
      i += delimiter.length - 1;
      flush();
      continue;
    }

    buffer += char;
  }

  flush();

  // Descartar fragmentos que sólo contienen comentarios.
  return statements.filter((s) =>
    s
      .split('\n')
      .some((line) => {
        const t = line.trim();
        return t.length > 0 && !t.startsWith('--') && !t.startsWith('#');
      })
  );
}

function discoverMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    // Los archivos `temporary_*` son volcados manuales que compiten con las
    // migraciones numeradas y definen las mismas tablas de forma incompatible.
    // Nunca deben ejecutarse desde aquí.
    .filter((f) => /^\d{3}_/.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

async function migrate(): Promise<void> {
  console.log('🔄 Iniciando migraciones...');

  let host = config.db.host;
  try {
    const result = await dnsLookup(config.db.host, { family: 4 });
    host = result.address;
    console.log(`[DB] Resolved ${config.db.host} -> ${host} (IPv4)`);
  } catch {
    console.warn(`[DB] DNS lookup failed, using original: ${config.db.host}`);
  }

  const connection = await mysql.createConnection({
    host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: false,
  });

  let failed = false;

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await connection.query(`USE \`${config.db.database}\``);

    // Registro de migraciones aplicadas. Sin esto cada ejecución reintenta
    // todo, y los ALTER TABLE no idempotentes (038, 045) abortan el proceso.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [appliedRows] = await connection.query<any[]>(
      'SELECT filename, checksum FROM schema_migrations'
    );
    const applied = new Map<string, string>(
      (appliedRows as any[]).map((r) => [r.filename, r.checksum])
    );

    const files = discoverMigrations();
    console.log(`📂 ${files.length} migraciones encontradas, ${applied.size} ya aplicadas`);

    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');

      const previous = applied.get(file);
      if (previous) {
        if (previous !== checksum) {
          console.warn(
            `⚠️  ${file} cambió después de aplicarse. No se re-ejecuta: ` +
              `crea una migración nueva en vez de editar una existente.`
          );
        }
        continue;
      }

      console.log(`📁 Ejecutando: ${file}`);
      const statements = splitSqlStatements(sql);

      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (error: any) {
          throw new Error(
            `${file} falló en la sentencia:\n${statement.slice(0, 300)}\n→ ${error.message}`
          );
        }
      }

      await connection.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
        [file, checksum]
      );
      console.log(`✅ ${file} completado (${statements.length} sentencias)`);
    }

    console.log('✅ Todas las migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error en migraciones:', error instanceof Error ? error.message : error);
    failed = true;
  } finally {
    await connection.end();
  }

  if (failed) process.exit(1);
}

// Permite importar splitSqlStatements desde las pruebas sin abrir conexiones.
const invokedDirectly =
  typeof process.argv[1] === 'string' && process.argv[1].includes('migrate');

if (invokedDirectly) {
  migrate();
}
