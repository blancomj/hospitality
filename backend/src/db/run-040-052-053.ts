import mysql from 'mysql2/promise';
import dns from 'dns';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { splitSqlStatements } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dnsLookup = promisify(dns.lookup);

const DB_CONFIG = {
  host: '31.97.208.105',
  port: 3306,
  user: 'u434343788_escala',
  password: 'M7qL9!pV2@tR8$k',
  database: 'u434343788_escala',
};

const MIGRATIONS = ['054_reviews_cycle.sql'];

async function run() {
  // __dirname at runtime = dist/db, so src/db/migrations is two levels up + src/db/migrations
  const srcDir = join(__dirname, '..', '..', 'src', 'db', 'migrations');
  let host = DB_CONFIG.host;
  try {
    const result = await dnsLookup(DB_CONFIG.host, { family: 4 });
    host = result.address;
    console.log(`[DB] ${DB_CONFIG.host} -> ${host}`);
  } catch {
    console.warn(`[DB] DNS fallback: ${DB_CONFIG.host}`);
  }

  const conn = await mysql.createConnection({ ...DB_CONFIG, host, multipleStatements: false });
  console.log('Conectado a MariaDB.\n');

  for (const file of MIGRATIONS) {
    const filePath = join(srcDir, file);
    const sql = readFileSync(filePath, 'utf8');
    const statements = splitSqlStatements(sql);

    console.log(`--- ${file} (${statements.length} sentencias) ---`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.length > 80 ? stmt.slice(0, 80) + '...' : stmt;
      try {
        await conn.query(stmt);
        console.log(`  [${i + 1}/${statements.length}] OK: ${preview}`);
      } catch (e: any) {
        // Ignorar errores "already exists" / "Duplicate" / "doesn't exist" en DROP
        const msg = (e.message || '').toLowerCase();
        const ignorable = msg.includes('already exists') || msg.includes('duplicate') || msg.includes("doesn't exist") || msg.includes('duplicate key') || msg.includes('lost connection');
        if (ignorable) {
          console.log(`  [${i + 1}/${statements.length}] SKIP (ya aplicado): ${preview}`);
        } else {
          console.error(`  [${i + 1}/${statements.length}] ERROR: ${preview}`);
          console.error(`    -> ${e.message}`);
          throw e;
        }
      }
    }
    console.log(`✅ ${file} completado\n`);
  }

  // Verificacion final
  console.log('--- Verificacion ---');

  const [fnInt] = await conn.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'fn_setting_int'`) as any[];
  console.log(`fn_setting_int: ${fnInt.length > 0 ? 'OK' : 'FALTA'}`);

  const [fnDec] = await conn.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'fn_setting_decimal'`) as any[];
  console.log(`fn_setting_decimal: ${fnDec.length > 0 ? 'OK' : 'FALTA'}`);

  const [view] = await conn.query(`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_search_properties'`) as any[];
  console.log(`v_search_properties: ${view.length > 0 ? 'OK' : 'FALTA'}`);

  const [refund] = await conn.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refund_requests'`) as any[];
  console.log(`refund_requests: ${refund.length > 0 ? 'OK' : 'FALTA'}`);

  const [spUpsert] = await conn.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'sp_upsert_firebase_user'`) as any[];
  console.log(`sp_upsert_firebase_user: ${spUpsert.length > 0 ? 'OK' : 'FALTA'}`);

  const [settings] = await conn.query(`SELECT key_name, value_number FROM platform_settings ORDER BY key_name`) as any[];
  console.log('\nplatform_settings:');
  settings.forEach((r: any) => console.log(`  ${r.key_name}: ${r.value_number}`));

  await conn.end();
  console.log('\n✅ Todas las migraciones ejecutadas.');
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
