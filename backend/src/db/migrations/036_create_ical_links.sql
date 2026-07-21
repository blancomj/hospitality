-- ============================================
-- Migración 036: Tabla ical_links
-- CONSTRUESCALA Hospitality
-- CU-27: Sincronización iCal
-- ============================================

CREATE TABLE IF NOT EXISTS ical_links (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  ical_url VARCHAR(2000) NOT NULL,
  last_synced_at TIMESTAMP NULL,
  sync_status ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property (property_id)
) ENGINE=InnoDB;

-- SP para sincronizar eventos iCal
DROP PROCEDURE IF EXISTS sp_sync_ical_events;

DELIMITER //

CREATE PROCEDURE sp_sync_ical_events(
    IN p_property_id BIGINT UNSIGNED,
    IN p_ical_url VARCHAR(2000),
    IN p_events JSON
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE v_count INT;
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_uid VARCHAR(200);
    DECLARE v_blocked_count INT DEFAULT 0;

    -- Obtener cantidad de eventos
    SET v_count = JSON_LENGTH(p_events);

    -- Procesar cada evento
    WHILE i < v_count DO
        SET v_start_date = STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '.start']))), '%Y-%m-%d');
        SET v_end_date = STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '.end']))), '%Y-%m-%d');
        SET v_uid = JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '.uid]')));

        -- Bloquear cada día del evento (excluyendo el día de checkout)
        WHILE v_start_date < v_end_date DO
            INSERT INTO availability_overrides (property_id, date, is_blocked, created_at)
            VALUES (p_property_id, v_start_date, 1, NOW())
            ON DUPLICATE KEY UPDATE is_blocked = 1;

            SET v_blocked_count = v_blocked_count + 1;
            SET v_start_date = DATE_ADD(v_start_date, INTERVAL 1 DAY);
        END WHILE;

        SET i = i + 1;
    END WHILE;

    -- Actualizar estado del enlace
    UPDATE ical_links
    SET last_synced_at = NOW(),
        sync_status = 'synced',
        error_message = NULL
    WHERE property_id = p_property_id
      AND ical_url = p_ical_url;

    SELECT v_blocked_count AS blocked_dates;
END //

DELIMITER ;
