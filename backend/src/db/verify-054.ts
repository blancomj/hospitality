import mysql from 'mysql2/promise';

async function verify() {
  const conn = await mysql.createConnection({
    host: '31.97.208.105', user: 'u434343788_escala',
    password: 'M7qL9!pV2@tR8$k', database: 'u434343788_escala',
  });

  const q = async (label: string, sql: string) => {
    const [r] = await conn.query(sql) as any[];
    const ok = r.length > 0;
    console.log(`${ok ? '✅' : '❌'} ${label}: ${ok ? 'OK' : 'FALTA'}`);
  };

  await q('sp_create_review', `SELECT 1 FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'sp_create_review'`);
  await q('sp_get_host_reviews', `SELECT 1 FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'sp_get_host_reviews'`);

  await q('v_search_properties', `SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_search_properties'`);
  await q('v_property_detail', `SELECT 1 FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_property_detail'`);

  await conn.end();
}

verify().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
