-- ============================================
-- Migración 044: Agregar property_type a properties
-- CONSTRUESCALA Hospitality
-- ============================================

ALTER TABLE properties
  ADD COLUMN property_type ENUM('apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion') NOT NULL DEFAULT 'apartamento' AFTER description;

CREATE INDEX idx_properties_type ON properties(property_type);
