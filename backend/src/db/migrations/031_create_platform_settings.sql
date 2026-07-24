-- ============================================
-- Migración 031: platform_settings
-- CU-57: Configuración de la plataforma
--
-- ESQUEMA ALINEADO CON PRODUCCIÓN (decisión A del traspaso).
-- Columnas tipadas en vez de VARCHAR + discriminador: evita los CAST y deja
-- que el motor valide el JSON. En una base limpia esto produce exactamente la
-- tabla que ya existe en producción, así que la migración es inocua allí.
-- ============================================

CREATE TABLE IF NOT EXISTS platform_settings (
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

-- Configuración por defecto. Cada valor va en la columna de su tipo.
INSERT IGNORE INTO platform_settings (key_name, value_number) VALUES
  ('default_commission_rate', 15.00),
  ('booking_expiry_minutes', 15),
  ('min_booking_nights', 1),
  ('max_booking_nights', 30);

INSERT IGNORE INTO platform_settings (key_name, value_json) VALUES
  ('cancellation_policies', '["flexible","moderada","estricta"]'),
  ('enabled_cities', '["Medellín","Cartagena"]');
