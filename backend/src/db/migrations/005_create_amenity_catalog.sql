-- ============================================
-- Migración 005: Tabla amenity_catalog
-- CONSTRUESCALA Hospitality
-- Catálogo estructurado de servicios y dotación
-- ============================================

CREATE TABLE IF NOT EXISTS amenity_catalog (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category ENUM('basicos','cocina','lavanderia','espacios','edificio','familia','seguridad','accesibilidad','politicas') NOT NULL,
  name VARCHAR(80) NOT NULL,
  icon VARCHAR(40) NOT NULL,
  allows_detail BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_category_name (category, name)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_amenity_category ON amenity_catalog(category);
CREATE INDEX IF NOT EXISTS idx_amenity_active ON amenity_catalog(is_active);
