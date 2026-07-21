-- ============================================
-- Migración 006: Tabla property_amenities
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id BIGINT UNSIGNED NOT NULL,
  amenity_id SMALLINT UNSIGNED NOT NULL,
  detail VARCHAR(120) NULL,
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenity_catalog(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
