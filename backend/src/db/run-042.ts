import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let host = '31.97.208.105';
  try {
    const result = await dnsLookup('srv743.hstgr.io', { family: 4 });
    host = result.address;
    console.log(`[DB] Resolved -> ${host}`);
  } catch {}

  const conn = await mysql.createConnection({
    host,
    port: 3306,
    user: 'u434343788_escala',
    password: 'M7qL9!pV2@tR8$k',
    database: 'u434343788_escala',
  });

  const sql = readFileSync(join(__dirname, '042_create_critical_stored_procedures.sql'), 'utf8');

  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 5 && !s.startsWith('--'));

  for (const stmt of statements) {
    if (stmt.startsWith('--') || stmt.length < 10) continue;
    try {
      await conn.execute(stmt);
      const first = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.log(`OK: ${first}...`);
    } catch (err: any) {
      const first = stmt.substring(0, 60).replace(/\n/g, ' ');
      console.error(`FAIL: ${first}... -> ${err.message}`);
    }
  }

  await conn.end();
  console.log('Done');
}

runMigration().catch(e => { console.error(e.message); process.exit(1); });
