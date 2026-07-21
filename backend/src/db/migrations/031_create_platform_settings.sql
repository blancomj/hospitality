-- ============================================
-- Migración 031: Tabla platform_settings
-- CONSTRUESCALA Hospitality
-- CU-57: Configuración de la plataforma
-- ============================================

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(60) PRIMARY KEY,
  setting_value VARCHAR(500) NOT NULL,
  value_type ENUM('int','decimal','string','bool','json') NOT NULL DEFAULT 'string',
  updated_by BIGINT UNSIGNED,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Insertar configuraciones por defecto
INSERT IGNORE INTO platform_settings (setting_key, setting_value, value_type) VALUES
  ('default_commission_rate', '15.00', 'decimal'),
  ('booking_expiry_minutes', '15', 'int'),
  ('cancellation_policies', '["flexible","moderada","estricta"]', 'json'),
  ('enabled_cities', '["Medellín","Cartagena"]', 'json'),
  ('min_booking_nights', '1', 'int'),
  ('max_booking_nights', '30', 'int');
