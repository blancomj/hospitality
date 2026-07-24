-- ============================================
-- Migración 007: Tabla property_photos
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS property_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  thumbnail_url VARCHAR(500),
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_photos (property_id, sort_order)
) ENGINE=InnoDB;
