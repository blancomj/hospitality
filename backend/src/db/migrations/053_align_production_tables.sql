-- ============================================
-- Migración 053: Alineación final de tablas con producción
-- CONSTRUESCALA Hospitality
--
-- Contexto: producción se construyó pegando migraciones a mano en phpMyAdmin,
-- nunca con el runner. Las rutinas y las vistas quedaron al día (verificado:
-- las 28 rutinas son idénticas en lógica), pero la capa de TABLAS quedó atrás.
-- Las migraciones 001-052 no la corrigen porque usan CREATE TABLE IF NOT EXISTS
-- y guardas condicionales que, al ver la columna presente, se saltan.
--
-- Esta migración corrige únicamente las divergencias con impacto funcional.
-- Las cosméticas (anchos de VARCHAR más amplios en producción, NULLability de
-- timestamps, columnas extra como host_profiles.bio) se dejan como están: son
-- inofensivas y estrecharlas arriesgaría truncar datos.
--
-- Idempotente: usa los helpers sp__add_column_if_missing (migración 051) e
-- information_schema. Segura para ejecutar múltiples veces.
--
-- MariaDB no admite IF ... THEN fuera de una rutina: la lógica condicional
-- vive en un procedimiento temporal que se crea, se llama y se elimina.
-- ============================================

-- --------------------------------------------
-- 1. ical_links: completar el esquema de la migración 036
-- --------------------------------------------
-- Sin estas columnas, sp_sync_ical_events falla con
-- "Unknown column 'ical_url' en 'WHERE'". La sincronización iCal entrante
-- —única vía real de integración con Airbnb y Booking.com— nunca ha podido
-- funcionar en producción.
CALL sp__add_column_if_missing('ical_links', 'ical_url',
  'VARCHAR(2000) NOT NULL');
CALL sp__add_column_if_missing('ical_links', 'source_name',
  'VARCHAR(100) NOT NULL');
CALL sp__add_column_if_missing('ical_links', 'sync_status',
  "ENUM('pending','synced','error') NOT NULL DEFAULT 'pending'");
CALL sp__add_column_if_missing('ical_links', 'last_synced_at',
  'TIMESTAMP NULL');
CALL sp__add_column_if_missing('ical_links', 'error_message',
  'TEXT NULL');

-- --------------------------------------------
-- 2. properties: reseñas y baños fraccionarios
-- --------------------------------------------
CALL sp__add_column_if_missing('properties', 'avg_rating',
  'DECIMAL(3,2) NULL');
CALL sp__add_column_if_missing('properties', 'review_count',
  'SMALLINT UNSIGNED NULL DEFAULT 0');

-- --------------------------------------------
-- 3. property_videos: orden y duración
-- --------------------------------------------
CALL sp__add_column_if_missing('property_videos', 'sort_order',
  'SMALLINT UNSIGNED NOT NULL DEFAULT 0');
CALL sp__add_column_if_missing('property_videos', 'duration_seconds',
  'SMALLINT UNSIGNED NULL');

-- --------------------------------------------
-- 4. Resto de la reconciliación (lógica condicional)
-- --------------------------------------------
DROP PROCEDURE IF EXISTS _mig053_align;

DELIMITER //

CREATE PROCEDURE _mig053_align()
BEGIN
  -- ------------------------------------------
  -- 4.1 properties.bathrooms -> DECIMAL(3,1)
  -- ------------------------------------------
  -- En producción es SMALLINT: no se puede registrar un inmueble de 1,5 baños.
  -- El ensanchamiento conserva todos los valores enteros existentes.
  SET @tipo_bathrooms = (
    SELECT DATA_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'bathrooms'
  );

  IF @tipo_bathrooms <> 'decimal' THEN
    UPDATE properties SET bathrooms = 1 WHERE bathrooms IS NULL;
    ALTER TABLE properties
      MODIFY COLUMN bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0;
  END IF;

  -- ------------------------------------------
  -- 4.2 properties.cancellation_policy -> ENUM
  -- ------------------------------------------
  -- En producción es VARCHAR(20). sp_quote_cancellation compara contra
  -- 'flexible' / 'moderada' / 'estricta'; una errata quedaría fuera de las tres
  -- ramas y produciría una cotización silenciosamente errónea. El ENUM lo
  -- impide desde la base.
  --
  -- Solo se convierte si TODOS los valores existentes son válidos. Si hay
  -- alguno fuera del conjunto, se deja como está para no perderlo.
  SET @tipo_policy = (
    SELECT DATA_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'cancellation_policy'
  );

  SET @policies_invalidas = (
    SELECT COUNT(*) FROM properties
    WHERE cancellation_policy NOT IN ('flexible', 'moderada', 'estricta')
  );

  IF @tipo_policy <> 'enum' AND @policies_invalidas = 0 THEN
    ALTER TABLE properties
      MODIFY COLUMN cancellation_policy
        ENUM('flexible','moderada','estricta') NOT NULL DEFAULT 'moderada';
  END IF;

  -- ------------------------------------------
  -- 4.3 host_profiles: consolidar la comisión
  -- ------------------------------------------
  -- Producción arrastra las dos columnas: commission_rate (heredada de la
  -- migración 002) y custom_commission_rate (la que usan las 28 rutinas y el
  -- backend, que la lee con alias: `custom_commission_rate AS commission_rate`).
  -- Tener ambas es la causa de que distintas partes del sistema lean valores
  -- distintos. Se preserva el dato antes de eliminar la vieja.
  SET @tiene_vieja = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'host_profiles' AND COLUMN_NAME = 'commission_rate'
  );

  SET @tiene_nueva = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'host_profiles' AND COLUMN_NAME = 'custom_commission_rate'
  );

  IF @tiene_vieja > 0 AND @tiene_nueva > 0 THEN
    -- La vieja solo gana donde la nueva está vacía.
    UPDATE host_profiles
    SET custom_commission_rate = commission_rate
    WHERE custom_commission_rate IS NULL
      AND commission_rate IS NOT NULL;

    ALTER TABLE host_profiles DROP COLUMN commission_rate;
  END IF;

  -- Si por lo que sea solo existiera la vieja, se renombra en vez de borrarse.
  IF @tiene_vieja > 0 AND @tiene_nueva = 0 THEN
    ALTER TABLE host_profiles
      CHANGE COLUMN commission_rate custom_commission_rate DECIMAL(5,2) NULL;
  END IF;

  -- ------------------------------------------
  -- 4.4 ical_links.token: liberar la restricción NOT NULL
  -- ------------------------------------------
  -- Columna heredada del esquema viejo. El backend inserta solo
  -- (property_id, source_name, ical_url), así que un NOT NULL sin valor por
  -- defecto rompe toda alta de enlace con
  -- "Field 'token' doesn't have a default value".
  -- El token de exportación real vive en properties.ical_export_token; éste es
  -- un huérfano. No se elimina por si alguna fila antigua lo usa, pero deja de
  -- ser obligatorio.
  SET @token_obligatorio = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ical_links'
      AND COLUMN_NAME = 'token'
      AND IS_NULLABLE = 'NO'
  );

  IF @token_obligatorio > 0 THEN
    ALTER TABLE ical_links MODIFY COLUMN token VARCHAR(100) NULL;
  END IF;

  -- ------------------------------------------
  -- 4.5 Eliminar índices redundantes
  -- ------------------------------------------
  -- Las migraciones crearon índices con nombres nuevos sobre columnas que ya
  -- tenían uno con el nombre viejo. En cada par sobra el no-único, porque el
  -- índice UNIQUE ya cubre la misma columna. Cada duplicado penaliza toda
  -- escritura sobre la tabla.
  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'idx_users_email') THEN
    ALTER TABLE users DROP INDEX idx_users_email;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'idx_users_google_id') THEN
    ALTER TABLE users DROP INDEX idx_users_google_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
               AND INDEX_NAME = 'idx_users_firebase_uid') THEN
    ALTER TABLE users DROP INDEX idx_users_firebase_uid;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
               AND INDEX_NAME = 'idx_wompi_transaction') THEN
    ALTER TABLE payments DROP INDEX idx_wompi_transaction;
  END IF;
END //

DELIMITER ;

CALL _mig053_align();
DROP PROCEDURE _mig053_align;

-- --------------------------------------------
-- 5. Rellenar avg_rating y review_count desde las reseñas existentes
-- --------------------------------------------
-- Fuera del procedimiento: son sentencias incondicionales y seguras sobre una
-- tabla vacía o poblada.
UPDATE properties p
LEFT JOIN (
  SELECT property_id,
         ROUND(AVG(rating), 2) AS media,
         COUNT(*) AS total
  FROM reviews
  GROUP BY property_id
) r ON r.property_id = p.id
SET p.avg_rating   = r.media,
    p.review_count = COALESCE(r.total, 0);
