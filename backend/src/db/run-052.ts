import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '31.97.208.105',
  user: 'u434343788_escala',
  password: 'M7qL9!pV2@tR8$k',
  database: 'u434343788_escala',
  multipleStatements: false,
  connectTimeout: 15000,
});

async function run() {
  const conn = await pool.getConnection();
  console.log('Conectado a MariaDB. Ejecutando migracion 052...\n');

  const stmts: Array<{ label: string; sql: string }> = [];

  // 1. Detectar esquema viejo
  stmts.push({
    label: 'Detectar esquema viejo de platform_settings',
    sql: `SELECT COUNT(*) AS has_old FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'platform_settings' AND COLUMN_NAME = 'setting_key'`,
  });

  const [oldSchema] = await conn.execute(stmts[stmts.length - 1].sql) as any[];
  const hasOldSchema = oldSchema[0]?.has_old > 0;

  if (hasOldSchema) {
    console.log('Esquema viejo detectado (setting_key). Convirtiendo...');
    
    // Crear tabla nueva
    await conn.execute(`CREATE TABLE IF NOT EXISTS platform_settings_new (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      key_name VARCHAR(100) NOT NULL,
      value_text TEXT NULL,
      value_number DECIMAL(10,2) NULL,
      value_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_platform_settings_key (key_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('  [OK] Tabla platform_settings_new creada');

    // Copiar datos
    await conn.execute(`
      INSERT INTO platform_settings_new (key_name, value_text, value_number, value_json, created_at)
      SELECT
        setting_key,
        CASE WHEN value_type = 'string' THEN setting_value ELSE NULL END,
        CASE WHEN value_type IN ('int','decimal') THEN CAST(setting_value AS DECIMAL(10,2)) ELSE NULL END,
        CASE WHEN value_type = 'json' THEN setting_value ELSE NULL END,
        COALESCE(updated_at, CURRENT_TIMESTAMP)
      FROM platform_settings
    `);
    console.log('  [OK] Datos copiados');

    // Defaults
    await conn.execute(`INSERT IGNORE INTO platform_settings_new (key_name, value_number) VALUES ('default_commission_rate', 15.00), ('booking_expiry_minutes', 15), ('min_booking_nights', 1), ('max_booking_nights', 365)`);
    await conn.execute(`INSERT IGNORE INTO platform_settings_new (key_name, value_json) VALUES ('cancellation_policies', '["flexible","moderada","estricta"]'), ('enabled_cities', '["Medellín","Cartagena"]')`);
    console.log('  [OK] Valores por defecto insertados');

    // Eliminar FK obsoleta
    try {
      const [fks] = await conn.execute(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'platform_settings' AND REFERENCED_TABLE_NAME = 'users' LIMIT 1`) as any[];
      if (fks.length > 0) {
        await conn.execute(`ALTER TABLE platform_settings DROP FOREIGN KEY \`${fks[0].CONSTRAINT_NAME}\``);
        console.log(`  [OK] FK obsoleta ${fks[0].CONSTRAINT_NAME} eliminada`);
      }
    } catch {}

    // Renombrar
    await conn.execute(`RENAME TABLE platform_settings TO platform_settings_old, platform_settings_new TO platform_settings`);
    await conn.execute(`DROP TABLE IF EXISTS platform_settings_old`);
    console.log('  [OK] Tabla reconstruida');
  } else {
    console.log('Esquema nuevo ya presente (key_name). Saltando conversion.');
  }

  // 2. max_booking_nights = 365
  await conn.execute(`UPDATE platform_settings SET value_number = 365 WHERE key_name = 'max_booking_nights' AND value_number IS NOT NULL AND value_number <= 30`);
  console.log('  [OK] max_booking_nights asegurado en 365');

  // 3. Reconstruir fn_setting_int
  await conn.execute(`DROP FUNCTION IF EXISTS fn_setting_int`);
  await conn.execute(`
    CREATE FUNCTION fn_setting_int(p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, p_default INT)
    RETURNS INT DETERMINISTIC READS SQL DATA
    BEGIN
      DECLARE v_value INT;
      SELECT ROUND(value_number) INTO v_value FROM platform_settings WHERE key_name = p_key AND value_number IS NOT NULL LIMIT 1;
      RETURN COALESCE(v_value, p_default);
    END
  `);
  console.log('  [OK] fn_setting_int reconstruida');

  // 4. Reconstruir fn_setting_decimal
  await conn.execute(`DROP FUNCTION IF EXISTS fn_setting_decimal`);
  await conn.execute(`
    CREATE FUNCTION fn_setting_decimal(p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci, p_default DECIMAL(10,2))
    RETURNS DECIMAL(10,2) DETERMINISTIC READS SQL DATA
    BEGIN
      DECLARE v_value DECIMAL(10,2);
      SELECT value_number INTO v_value FROM platform_settings WHERE key_name = p_key AND value_number IS NOT NULL LIMIT 1;
      RETURN COALESCE(v_value, p_default);
    END
  `);
  console.log('  [OK] fn_setting_decimal reconstruida');

  // 5. properties.country
  const [hasCountry] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'country'`) as any[];
  if (hasCountry[0].c === 0) {
    await conn.execute(`ALTER TABLE properties ADD COLUMN country VARCHAR(2) NULL DEFAULT 'CO' AFTER city`);
    console.log('  [OK] Columna properties.country anadida');
  } else {
    console.log('  [OK] properties.country ya existe');
  }

  // 6. property_photos.image_url
  const [hasImageUrl] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_photos' AND COLUMN_NAME = 'image_url'`) as any[];
  const [hasUrl] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_photos' AND COLUMN_NAME = 'url'`) as any[];
  if (hasImageUrl[0].c === 0 && hasUrl[0].c > 0) {
    await conn.execute(`ALTER TABLE property_photos CHANGE COLUMN url image_url VARCHAR(500) NOT NULL`);
    console.log('  [OK] property_photos.url renombrado a image_url');
  } else if (hasImageUrl[0].c === 0) {
    await conn.execute(`ALTER TABLE property_photos ADD COLUMN image_url VARCHAR(500) NOT NULL AFTER property_id`);
    console.log('  [OK] Columna property_photos.image_url anadida');
  } else {
    console.log('  [OK] property_photos.image_url ya existe');
  }

  // 7. property_photos.is_primary
  const [hasPrimary] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_photos' AND COLUMN_NAME = 'is_primary'`) as any[];
  if (hasPrimary[0].c === 0) {
    await conn.execute(`ALTER TABLE property_photos ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER image_url`);
    await conn.execute(`UPDATE property_photos pp JOIN (SELECT MIN(id) AS min_id FROM property_photos GROUP BY property_id) first ON pp.id = first.min_id SET pp.is_primary = 1`);
    console.log('  [OK] Columna property_photos.is_primary anadida y portadas marcadas');
  } else {
    console.log('  [OK] property_photos.is_primary ya existe');
  }

  // 8. property_videos.video_url
  const [hasVideoUrl] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_videos' AND COLUMN_NAME = 'video_url'`) as any[];
  const [hasVUrl] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'property_videos' AND COLUMN_NAME = 'url'`) as any[];
  if (hasVideoUrl[0].c === 0 && hasVUrl[0].c > 0) {
    await conn.execute(`ALTER TABLE property_videos CHANGE COLUMN url video_url VARCHAR(500) NOT NULL`);
    console.log('  [OK] property_videos.url renombrado a video_url');
  } else if (hasVideoUrl[0].c === 0) {
    await conn.execute(`ALTER TABLE property_videos ADD COLUMN video_url VARCHAR(500) NOT NULL AFTER property_id`);
    console.log('  [OK] Columna property_videos.video_url anadida');
  } else {
    console.log('  [OK] property_videos.video_url ya existe');
  }

  // 9. host_profiles.custom_commission_rate
  const [hasCustom] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'host_profiles' AND COLUMN_NAME = 'custom_commission_rate'`) as any[];
  const [hasOldComm] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'host_profiles' AND COLUMN_NAME = 'commission_rate'`) as any[];
  if (hasOldComm[0].c > 0 && hasCustom[0].c === 0) {
    await conn.execute(`ALTER TABLE host_profiles CHANGE COLUMN commission_rate custom_commission_rate DECIMAL(5,2) NULL`);
    console.log('  [OK] host_profiles.commission_rate renombrado a custom_commission_rate');
  } else if (hasCustom[0].c === 0) {
    await conn.execute(`ALTER TABLE host_profiles ADD COLUMN custom_commission_rate DECIMAL(5,2) NULL AFTER bank_account_type`);
    console.log('  [OK] Columna host_profiles.custom_commission_rate anadida');
  } else {
    console.log('  [OK] host_profiles.custom_commission_rate ya existe');
  }

  // 10. bookings columns
  const [hasCancelReason] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'cancellation_reason'`) as any[];
  if (hasCancelReason[0].c === 0) {
    await conn.execute(`ALTER TABLE bookings ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER expires_at, ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason, ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by`);
    console.log('  [OK] Columnas de cancelacion en bookings anadidas');
  } else {
    console.log('  [OK] Columnas de cancelacion en bookings ya existen');
  }

  // 11. payments columns
  const [hasRef] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'reference'`) as any[];
  if (hasRef[0].c === 0) {
    await conn.execute(`ALTER TABLE payments ADD COLUMN reference VARCHAR(60) NULL AFTER booking_id`);
    console.log('  [OK] Columna payments.reference anadida');
  } else {
    console.log('  [OK] payments.reference ya existe');
  }

  const [hasRefunded] = await conn.execute(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'refunded_amount'`) as any[];
  if (hasRefunded[0].c === 0) {
    await conn.execute(`ALTER TABLE payments ADD COLUMN refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER amount`);
    console.log('  [OK] Columna payments.refunded_amount anadida');
  } else {
    console.log('  [OK] payments.refunded_amount ya existe');
  }

  // 12. refund_requests
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      booking_id BIGINT UNSIGNED NOT NULL,
      payment_id BIGINT UNSIGNED NOT NULL,
      requested_by BIGINT UNSIGNED NOT NULL,
      requested_amount DECIMAL(10,2) NOT NULL,
      refund_percentage DECIMAL(5,2) NOT NULL,
      policy_applied VARCHAR(20) NOT NULL,
      days_until_checkin INT NOT NULL,
      reason VARCHAR(500) NULL,
      status ENUM('pending','processing','approved','rejected','failed') NOT NULL DEFAULT 'pending',
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at TIMESTAMP NULL,
      review_notes VARCHAR(500) NULL,
      wompi_refund_id VARCHAR(100) NULL,
      failure_reason VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_booking (booking_id),
      INDEX idx_status_created (status, created_at)
    ) ENGINE=InnoDB
  `);
  console.log('  [OK] Tabla refund_requests asegurada');

  // 13. bookings.status enum
  await conn.execute(`ALTER TABLE bookings MODIFY COLUMN status ENUM('pending_payment','confirmed','cancelled','completed','expired','refunded') NOT NULL DEFAULT 'pending_payment'`);
  console.log('  [OK] bookings.status ENUM actualizado');

  // 14. payments.status enum
  await conn.execute(`ALTER TABLE payments MODIFY COLUMN status ENUM('pending','approved','declined','refunded','partially_refunded') NOT NULL DEFAULT 'pending'`);
  console.log('  [OK] payments.status ENUM actualizado');

  // 15. v_search_properties
  await conn.execute(`DROP VIEW IF EXISTS v_search_properties`);
  await conn.execute(`
    CREATE VIEW v_search_properties AS
    SELECT
      p.id, p.host_id, p.title, p.description, p.property_type,
      p.city, p.country, p.address, p.latitude, p.longitude,
      p.max_guests, p.bedrooms, p.bathrooms, p.base_price_per_night,
      p.cancellation_policy, p.status, p.created_at, p.updated_at,
      u.full_name AS host_name, u.avatar_url AS host_avatar,
      (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
      (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
    FROM properties p
    JOIN users u ON p.host_id = u.id
    WHERE p.status = 'published'
  `);
  console.log('  [OK] Vista v_search_properties recreada');

  // Verificar
  const [check] = await conn.execute(`SELECT key_name, value_number FROM platform_settings ORDER BY key_name`) as any[];
  console.log('\n--- platform_settings actual ---');
  check.forEach((r: any) => console.log(`  ${r.key_name}: ${r.value_number}`));

  const [fns] = await conn.execute(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME LIKE 'fn_setting%'`) as any[];
  console.log('\n--- Funciones fn_setting ---');
  fns.forEach((r: any) => console.log(`  ${r.ROUTINE_NAME}: OK`));

  conn.release();
  await pool.end();
  console.log('\nMigracion 052 completada exitosamente.');
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
