import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: '31.97.208.105',
  port: 3306,
  user: 'u434343788_escala',
  password: 'M7qL9!pV2@tR8$k',
  database: 'u434343788_escala',
};

async function verify() {
  const conn = await mysql.createConnection(DB_CONFIG);

  // 1. v_admin_kpis existe y tiene 15 columnas
  const [views] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_admin_kpis'`
  ) as any[];
  console.log(`v_admin_kpis: ${views.length > 0 ? 'OK' : 'FALTA'}`);

  const [cols] = await conn.query('SHOW COLUMNS FROM v_admin_kpis') as any[];
  console.log(`Columnas v_admin_kpis: ${cols.length}`);

  // 2. KPIs con cifras correctas (no infladas)
  const [kpi] = await conn.query('SELECT gmv, commissions_generated FROM v_admin_kpis') as any[];
  console.log(`KPIs: gmv=${kpi[0].gmv}, commissions=${kpi[0].commissions_generated}`);

  // 3. payouts.status incluye 'held'
  const [enumCol] = await conn.query(
    `SHOW COLUMNS FROM payouts WHERE Field = 'status'`
  ) as any[];
  console.log(`payouts.status type: ${enumCol[0]?.Type}`);
  const hasHeld = enumCol[0]?.Type?.includes('held');
  console.log(`payouts.status incluye 'held': ${hasHeld ? 'OK' : 'FALTA'}`);

  await conn.end();
  console.log('\n✅ Verificación 055 completada.');
}

verify().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
