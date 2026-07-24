-- ============================================
-- Migración 052: Reconciliación de esquema
-- CONSTRUESCALA Hospitality
--
-- Converge el esquema de producción (viejo: setting_key/setting_value/value_type)
-- con el esquema nuevo (key_name/value_text/value_number/value_json).
--
-- También reconstruye fn_setting_int, fn_setting_decimal y v_search_properties
-- que quedaron con definiciones obsoletas en la BD de producción.
--
-- Idempotente: usa DROP IF EXISTS / CREATE IF NOT EXISTS / information_schema.
-- Seguro para ejecutar múltiples veces.
-- ============================================

-- --------------------------------------------
-- 1. Reconstruir platform_settings si tiene el esquema viejo
-- --------------------------------------------
SET @has_old_schema = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'platform_settings'
    AND COLUMN_NAME = 'setting_key'
);

SET @has_new_schema = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'platform_settings'
    AND COLUMN_NAME = 'key_name'
);

-- Si tiene el esquema viejo (setting_key) pero no el nuevo (key_name),
-- reconstruir la tabla.
IF @has_old_schema > 0 AND @has_new_schema = 0 THEN
  -- Crear tabla temporal con el esquema nuevo
  CREATE TABLE IF NOT EXISTS platform_settings_new (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    key_name VARCHAR(100) NOT NULL,
    value_text TEXT NULL,
    value_number DECIMAL(10,2) NULL,
    value_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_platform_settings_key (key_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Copiar datos según el tipo
  INSERT INTO platform_settings_new (key_name, value_text, value_number, value_json, created_at)
  SELECT
    setting_key,
    CASE
      WHEN value_type = 'string' THEN setting_value
      ELSE NULL
    END,
    CASE
      WHEN value_type = 'int' THEN CAST(setting_value AS DECIMAL(10,2))
      WHEN value_type = 'decimal' THEN CAST(setting_value AS DECIMAL(10,2))
      ELSE NULL
    END,
    CASE
      WHEN value_type = 'json' THEN setting_value
      ELSE NULL
    END,
    COALESCE(updated_at, CURRENT_TIMESTAMP)
  FROM platform_settings;

  -- Insertar valores por defecto si no existen
  INSERT IGNORE INTO platform_settings_new (key_name, value_number) VALUES
    ('default_commission_rate', 15.00),
    ('booking_expiry_minutes', 15),
    ('min_booking_nights', 1),
    ('max_booking_nights', 365);

  INSERT IGNORE INTO platform_settings_new (key_name, value_json) VALUES
    ('cancellation_policies', '["flexible","moderada","estricta"]'),
    ('enabled_cities', '["Medellín","Cartagena"]');

  -- Eliminar FK obsoleta a users(updated_by) si existe
  SET @fk_name = (
    SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'platform_settings'
      AND REFERENCED_TABLE_NAME = 'users'
      AND REFERENCED_COLUMN_NAME = 'id'
    LIMIT 1
  );

  IF @fk_name IS NOT NULL THEN
    SET @drop_fk = CONCAT('ALTER TABLE platform_settings DROP FOREIGN KEY `', @fk_name, '`');
    PREPARE stmt FROM @drop_fk;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;

  -- Renombrar tablas
  RENAME TABLE platform_settings TO platform_settings_old,
               platform_settings_new TO platform_settings;

  -- Eliminar tabla vieja
  DROP TABLE IF EXISTS platform_settings_old;
END IF;

-- Si no existe la tabla en absoluto, crearla con el esquema nuevo
SET @table_exists = (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'platform_settings'
);

IF @table_exists = 0 THEN
  CREATE TABLE platform_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    key_name VARCHAR(100) NOT NULL,
    value_text TEXT NULL,
    value_number DECIMAL(10,2) NULL,
    value_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_platform_settings_key (key_name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  INSERT IGNORE INTO platform_settings (key_name, value_number) VALUES
    ('default_commission_rate', 15.00),
    ('booking_expiry_minutes', 15),
    ('min_booking_nights', 1),
    ('max_booking_nights', 365);

  INSERT IGNORE INTO platform_settings (key_name, value_json) VALUES
    ('cancellation_policies', '["flexible","moderada","estricta"]'),
    ('enabled_cities', '["Medellín","Cartagena"]');
END IF;

-- Asegurar que max_booking_nights sea 365 (no 30)
UPDATE platform_settings
SET value_number = 365
WHERE key_name = 'max_booking_nights'
  AND value_number IS NOT NULL
  AND value_number <= 30;

-- --------------------------------------------
-- 2. Reconstruir fn_setting_int y fn_setting_decimal
-- --------------------------------------------
DROP FUNCTION IF EXISTS fn_setting_int;
DROP FUNCTION IF EXISTS fn_setting_decimal;

DELIMITER //

CREATE FUNCTION fn_setting_int(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value INT;

  SELECT ROUND(value_number) INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

CREATE FUNCTION fn_setting_decimal(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value DECIMAL(10,2);

  SELECT value_number INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

DELIMITER ;

-- --------------------------------------------
-- 3. Asegurar columnas faltantes en properties
-- --------------------------------------------
-- country (referenciada por 5 vistas)
SET @has_country = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'properties'
    AND COLUMN_NAME = 'country'
);

IF @has_country = 0 THEN
  ALTER TABLE properties ADD COLUMN country VARCHAR(2) NULL DEFAULT 'CO' AFTER city;
END IF;

-- --------------------------------------------
-- 4. Asegurar columnas faltantes en property_photos
-- --------------------------------------------
-- image_url (la migración 007 original usaba 'url')
SET @has_image_url = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'property_photos'
    AND COLUMN_NAME = 'image_url'
);

SET @has_url = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'property_photos'
    AND COLUMN_NAME = 'url'
);

-- Si tiene 'url' pero no 'image_url', renombrar
IF @has_url > 0 AND @has_image_url = 0 THEN
  ALTER TABLE property_photos CHANGE COLUMN url image_url VARCHAR(500) NOT NULL;
END IF;

-- Si no tiene ninguna, crear image_url
IF @has_url = 0 AND @has_image_url = 0 THEN
  ALTER TABLE property_photos ADD COLUMN image_url VARCHAR(500) NOT NULL AFTER property_id;
END IF;

-- is_primary
SET @has_is_primary = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'property_photos'
    AND COLUMN_NAME = 'is_primary'
);

IF @has_is_primary = 0 THEN
  ALTER TABLE property_photos ADD COLUMN is_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER image_url;
  -- Marcar la primera foto de cada propiedad como portada
  UPDATE property_photos pp
  JOIN (
    SELECT MIN(id) AS min_id FROM property_photos GROUP BY property_id
  ) first ON pp.id = first.min_id
  SET pp.is_primary = 1;
END IF;

-- --------------------------------------------
-- 5. Asegurar columnas faltantes en property_videos
-- --------------------------------------------
-- video_url (la migración 008 original usaba 'url')
SET @has_video_url = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'property_videos'
    AND COLUMN_NAME = 'video_url'
);

SET @has_v_url = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'property_videos'
    AND COLUMN_NAME = 'url'
);

IF @has_v_url > 0 AND @has_video_url = 0 THEN
  ALTER TABLE property_videos CHANGE COLUMN url video_url VARCHAR(500) NOT NULL;
END IF;

IF @has_v_url = 0 AND @has_video_url = 0 THEN
  ALTER TABLE property_videos ADD COLUMN video_url VARCHAR(500) NOT NULL AFTER property_id;
END IF;

-- --------------------------------------------
-- 6. Asegurar columnas faltantes en host_profiles
-- --------------------------------------------
-- custom_commission_rate (la migración 002 original usaba 'commission_rate')
SET @has_custom = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'host_profiles'
    AND COLUMN_NAME = 'custom_commission_rate'
);

SET @has_old_commission = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'host_profiles'
    AND COLUMN_NAME = 'commission_rate'
);

IF @has_old_commission > 0 AND @has_custom = 0 THEN
  ALTER TABLE host_profiles CHANGE COLUMN commission_rate custom_commission_rate DECIMAL(5,2) NULL;
END IF;

IF @has_old_commission = 0 AND @has_custom = 0 THEN
  ALTER TABLE host_profiles ADD COLUMN custom_commission_rate DECIMAL(5,2) NULL AFTER bank_account_type;
END IF;

-- --------------------------------------------
-- 7. Reconstruir v_search_properties
-- --------------------------------------------
DROP VIEW IF EXISTS v_search_properties;

CREATE VIEW v_search_properties AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.property_type,
  p.city,
  p.country,
  p.address,
  p.latitude,
  p.longitude,
  p.max_guests,
  p.bedrooms,
  p.bathrooms,
  p.base_price_per_night,
  p.cancellation_policy,
  p.status,
  p.created_at,
  p.updated_at,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
  (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
WHERE p.status = 'published';

-- --------------------------------------------
-- 8. Asegurar columnas en bookings (para migraciones anteriores)
-- --------------------------------------------
-- cancellation_reason, cancelled_by, cancelled_at (de la 038)
SET @has_cancel_reason = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND COLUMN_NAME = 'cancellation_reason'
);

IF @has_cancel_reason = 0 THEN
  ALTER TABLE bookings
    ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER expires_at,
    ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
    ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by;
END IF;

-- --------------------------------------------
-- 9. Asegurar columnas en payments (para migraciones anteriores)
-- --------------------------------------------
-- reference, refunded_amount (de la 051)
SET @has_ref = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'reference'
);

IF @has_ref = 0 THEN
  ALTER TABLE payments ADD COLUMN reference VARCHAR(60) NULL AFTER booking_id;
END IF;

SET @has_refunded = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'refunded_amount'
);

IF @has_refunded = 0 THEN
  ALTER TABLE payments ADD COLUMN refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER amount;
END IF;

-- --------------------------------------------
-- 10. Asegurar tabla refund_requests
-- --------------------------------------------
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
  status ENUM('pending','processing','approved','rejected','failed')
    NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_notes VARCHAR(500) NULL,
  wompi_refund_id VARCHAR(100) NULL,
  failure_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking (booking_id),
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB;

-- --------------------------------------------
-- 11. Asegurar bookings.status enum completo
-- --------------------------------------------
ALTER TABLE bookings
  MODIFY COLUMN status
    ENUM('pending_payment','confirmed','cancelled','completed','expired','refunded')
    NOT NULL DEFAULT 'pending_payment';

-- --------------------------------------------
-- 12. Asegurar payments.status enum completo
-- --------------------------------------------
ALTER TABLE payments
  MODIFY COLUMN status
    ENUM('pending','approved','declined','refunded','partially_refunded')
    NOT NULL DEFAULT 'pending';

-- --------------------------------------------
-- 13. Unique index en payments.reference
-- --------------------------------------------
SET @has_uq_ref = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND INDEX_NAME = 'uq_payments_reference'
);

IF @has_uq_ref = 0 THEN
  ALTER TABLE payments ADD UNIQUE INDEX uq_payments_reference (reference);
END IF;
