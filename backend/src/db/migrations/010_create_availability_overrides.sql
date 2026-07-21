-- ============================================
-- Migración 010: Tabla availability_overrides
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS availability_overrides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  special_price DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_property_date (property_id, date),
  INDEX idx_property_date (property_id, date)
) ENGINE=InnoDB;
