-- ============================================
-- Migración 009: Tabla property_translations
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS property_translations (
  property_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(5) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  is_auto_translated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, locale),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;
