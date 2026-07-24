import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = mysql.createPool({
  host: '31.97.208.105',
  user: 'u434343788_escala',
  password: 'M7qL9!pV2@tR8$k',
  database: 'u434343788_escala',
  multipleStatements: true,
  connectTimeout: 15000,
});

async function backup() {
  const conn = await pool.getConnection();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${timestamp}.sql`;
  const filepath = join(__dirname, '..', '..', '..', filename);

  const lines: string[] = [];
  lines.push(`-- ============================================`);
  lines.push(`-- BACKUP: u434343788_escala`);
  lines.push(`-- Fecha: ${new Date().toISOString()}`);
  lines.push(`-- ============================================`);
  lines.push('');

  // 1. Listar tablas
  const [tables] = await conn.execute(`SHOW TABLES`) as any[];
  const tableNames = tables.map((r: any) => Object.values(r)[0] as string);
  console.log(`Tablas encontradas: ${tableNames.length}`);

  // 2. Para cada tabla: estructura + datos
  for (const table of tableNames) {
    console.log(`  Exportando: ${table}`);

    // Estructura
    const [createTable] = await conn.execute(`SHOW CREATE TABLE \`${table}\``) as any[];
    lines.push(`-- -------------------------------------------`);
    lines.push(`-- Tabla: ${table}`);
    lines.push(`-- -------------------------------------------`);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(createTable[0]['Create Table'] + ';');
    lines.push('');

    // Datos
    const [rows] = await conn.execute(`SELECT * FROM \`${table}\``) as any[];
    if (rows.length > 0) {
      // Obtener nombres de columnas
      const [colRows] = await conn.execute(`SHOW COLUMNS FROM \`${table}\``) as any[];
      const columns = colRows.map((c: any) => c.Field);

      lines.push(`LOCK TABLES \`${table}\` WRITE;`);
      lines.push(`INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES`);

      const valueLines: string[] = [];
      for (const row of rows) {
        const vals = columns.map((col: string) => {
          const v = row[col];
          if (v === null) return 'NULL';
          if (typeof v === 'number') return String(v);
          if (typeof v === 'boolean') return v ? '1' : '0';
          if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
          // Escape strings
          const escaped = String(v)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `'${escaped}'`;
        });
        valueLines.push(`  (${vals.join(', ')})`);
      }
      lines.push(valueLines.join(',\n') + ';');
      lines.push(`UNLOCK TABLES;`);
      lines.push('');
    }
  }

  // 3. Stored procedures y functions
  const [routines] = await conn.execute(
    `SELECT ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_DEFINITION
     FROM information_schema.ROUTINES
     WHERE ROUTINE_SCHEMA = DATABASE()
     ORDER BY ROUTINE_TYPE, ROUTINE_NAME`
  ) as any[];

  if (routines.length > 0) {
    lines.push(`-- -------------------------------------------`);
    lines.push(`-- Stored Procedures y Functions`);
    lines.push(`-- -------------------------------------------`);

    for (const r of routines) {
      console.log(`  Exportando: ${r.ROUTINE_TYPE} ${r.ROUTINE_NAME}`);
      lines.push(`DROP ${r.ROUTINE_TYPE === 'PROCEDURE' ? 'PROCEDURE' : 'FUNCTION'} IF EXISTS \`${r.ROUTINE_NAME}\`;`);
      lines.push(`DELIMITER //`);
      lines.push(`CREATE ${r.ROUTINE_TYPE} \`${r.ROUTINE_NAME}\`(${r.ROUTINE_DEFINITION ? '' : ''})`);
      lines.push(r.ROUTINE_DEFINITION || '-- DEFINITION NOT AVAILABLE');
      lines.push(`//`);
      lines.push(`DELIMITER ;`);
      lines.push('');
    }
  }

  // 4. Vistas
  const [views] = await conn.execute(
    `SELECT TABLE_NAME, VIEW_DEFINITION
     FROM information_schema.VIEWS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME`
  ) as any[];

  if (views.length > 0) {
    lines.push(`-- -------------------------------------------`);
    lines.push(`-- Vistas`);
    lines.push(`-- -------------------------------------------`);

    for (const v of views) {
      console.log(`  Exportando: vista ${v.TABLE_NAME}`);
      lines.push(`DROP VIEW IF EXISTS \`${v.TABLE_NAME}\`;`);
      lines.push(`CREATE VIEW \`${v.TABLE_NAME}\` AS`);
      lines.push(v.VIEW_DEFINITION || '-- DEFINITION NOT AVAILABLE');
      lines.push(';;');
      lines.push('');
    }
  }

  conn.release();
  await pool.end();

  const content = lines.join('\n');
  writeFileSync(filepath, content, 'utf-8');
  console.log(`\nBackup completado: ${filepath}`);
  console.log(`Tamano: ${(content.length / 1024).toFixed(1)} KB`);
  console.log(`Tablas: ${tableNames.length}, SPs/Functions: ${routines.length}, Vistas: ${views.length}`);
}

backup().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
