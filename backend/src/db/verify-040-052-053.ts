import mysql from 'mysql2/promise';

async function verify() {
  const conn = await mysql.createConnection({
    host: '31.97.208.105', user: 'u434343788_escala',
    password: 'M7qL9!pV2@tR8$k', database: 'u434343788_escala',
    multipleStatements: false,
  });

  const checks: [string, string][] = [];

  // 1. fn_setting_int usa key_name?
  const [fn] = await conn.query(`SELECT ROUTINE_DEFINITION FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'fn_setting_int'`) as any[];
  checks.push(['fn_setting_int usa key_name', fn[0]?.ROUTINE_DEFINITION?.includes('key_name') ? 'SI' : 'NO']);

  // 2. v_search_properties
  const [vw] = await conn.query(`SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_search_properties'`) as any[];
  checks.push(['v_search_properties', vw.length > 0 ? 'OK' : 'FALTA']);

  // 3. ical_links.ical_url
  const [ical] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ical_links' AND COLUMN_NAME = 'ical_url'`) as any[];
  checks.push(['ical_links.ical_url', ical.length > 0 ? 'OK' : 'FALTA']);

  // 4. properties.avg_rating
  const [avg] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'avg_rating'`) as any[];
  checks.push(['properties.avg_rating', avg.length > 0 ? 'OK' : 'FALTA']);

  // 5. properties.bathrooms type
  const [bath] = await conn.query(`SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'bathrooms'`) as any[];
  checks.push(['properties.bathrooms type', bath[0]?.DATA_TYPE || 'UNKNOWN']);

  // 6. host_profiles commission_rate old removed?
  const [oldC] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'host_profiles' AND COLUMN_NAME = 'commission_rate'`) as any[];
  checks.push(['host_profiles.commission_rate (old)', oldC.length > 0 ? 'AUN EXISTE' : 'ELIMINADA (ok)']);

  // 7. users.firebase_uid
  const [fb] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'firebase_uid'`) as any[];
  checks.push(['users.firebase_uid', fb.length > 0 ? 'OK' : 'FALTA']);

  // 8. sp_upsert_firebase_user
  const [sp] = await conn.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'sp_upsert_firebase_user'`) as any[];
  checks.push(['sp_upsert_firebase_user', sp.length > 0 ? 'OK' : 'FALTA']);

  // 9. refund_requests
  const [rr] = await conn.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refund_requests'`) as any[];
  checks.push(['refund_requests', rr.length > 0 ? 'OK' : 'FALTA']);

  // 10. platform_settings usa key_name
  const [ps] = await conn.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'platform_settings' AND COLUMN_NAME = 'key_name'`) as any[];
  checks.push(['platform_settings.key_name', ps.length > 0 ? 'OK' : 'FALTA']);

  // 11. fn_setting_decimal
  const [fd] = await conn.query(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = 'fn_setting_decimal'`) as any[];
  checks.push(['fn_setting_decimal', fd.length > 0 ? 'OK' : 'FALTA']);

  // 12. idx_users_email eliminado?
  const [idx] = await conn.query(`SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email'`) as any[];
  checks.push(['idx_users_email (redundante)', idx.length > 0 ? 'AUN EXISTE' : 'ELIMINADA (ok)']);

  for (const [label, result] of checks) {
    const icon = result === 'OK' || result === 'SI' || result === 'ELIMINADA (ok)' || result === 'decimal' ? '✅' : '❌';
    console.log(`${icon} ${label}: ${result}`);
  }

  await conn.end();
}

verify().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
