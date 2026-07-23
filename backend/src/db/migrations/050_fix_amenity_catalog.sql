-- ============================================
-- Migración 050: Reparación del catálogo de amenidades
-- CONSTRUESCALA Hospitality
--
-- Existían dos definiciones incompatibles del catálogo:
--
--   005_create_amenity_catalog.sql  -> category ENUM NOT NULL,
--                                      UNIQUE (category, name)
--   temporary_all_tables.sql        -> sin category, UNIQUE (name),
--                                      y un seed mínimo ('WiFi', 'Parking'…)
--
-- La 046 añadió después category/allows_detail/sort_order/is_active como
-- columnas nullables, así que las filas sembradas por el archivo temporal
-- quedaron SIN categoría. Como getAmenityCatalog agrupa por category, esas
-- amenidades caían en un grupo vacío y el selector del propietario no las
-- mostraba correctamente.
--
-- Esta migración es idempotente y funciona con cualquiera de las dos claves
-- únicas: el ON DUPLICATE KEY UPDATE reasigna categoría, icono, orden y
-- allows_detail tanto si la colisión ocurre por `name` como por
-- `(category, name)`.
-- ============================================

-- 1) Normalizar nombres del seed temporal para que coincidan con el catálogo
--    definitivo antes de reasignar categorías (evita duplicados por variantes
--    de escritura).
UPDATE amenity_catalog SET name = 'Wifi'                 WHERE LOWER(name) = 'wifi';
UPDATE amenity_catalog SET name = 'Parqueadero gratuito' WHERE LOWER(name) IN ('parking', 'parqueadero');
UPDATE amenity_catalog SET name = 'Piscina'              WHERE LOWER(name) IN ('pool', 'piscina');
UPDATE amenity_catalog SET name = 'Aire acondicionado'   WHERE LOWER(name) IN ('air conditioning', 'ac', 'aire');
UPDATE amenity_catalog SET name = 'Cocina completa'      WHERE LOWER(name) IN ('kitchen', 'cocina');
UPDATE amenity_catalog SET name = 'Lavadora'             WHERE LOWER(name) IN ('washer', 'washing machine');
UPDATE amenity_catalog SET name = 'TV'                   WHERE LOWER(name) IN ('tv', 'television');
UPDATE amenity_catalog SET name = 'Gimnasio'             WHERE LOWER(name) IN ('gym', 'gimnasio');

-- 2) Sembrar el catálogo completo, actualizando las filas que ya existan.
INSERT INTO amenity_catalog (category, name, icon, allows_detail, sort_order, is_active) VALUES
-- Básicos
('basicos', 'Wifi', 'wifi', TRUE, 1, TRUE),
('basicos', 'TV', 'tv', FALSE, 2, TRUE),
('basicos', 'Aire acondicionado', 'air-vent', FALSE, 3, TRUE),
('basicos', 'Ventilador', 'fan', FALSE, 4, TRUE),
('basicos', 'Agua caliente', 'thermometer', FALSE, 5, TRUE),
('basicos', 'Closet', 'door-open', FALSE, 6, TRUE),
-- Cocina
('cocina', 'Cocina completa', 'chef-hat', FALSE, 1, TRUE),
('cocina', 'Nevera', 'refrigerator', FALSE, 2, TRUE),
('cocina', 'Estufa', 'flame', FALSE, 3, TRUE),
('cocina', 'Horno', 'cooking-pot', FALSE, 4, TRUE),
('cocina', 'Microondas', 'microwave', FALSE, 5, TRUE),
('cocina', 'Cafetera', 'coffee', FALSE, 6, TRUE),
('cocina', 'Licuadora', 'cup-soda', FALSE, 7, TRUE),
('cocina', 'Vajilla y utensilios', 'utensils', FALSE, 8, TRUE),
-- Lavandería
('lavanderia', 'Lavadora', 'washing-machine', FALSE, 1, TRUE),
('lavanderia', 'Secadora', 'shirt', FALSE, 2, TRUE),
('lavanderia', 'Plancha', 'zap', FALSE, 3, TRUE),
('lavanderia', 'Servicio de lavandería', 'sparkles', FALSE, 4, TRUE),
-- Espacios
('espacios', 'Balcón', 'fence', FALSE, 1, TRUE),
('espacios', 'Terraza', 'sun', FALSE, 2, TRUE),
('espacios', 'Jardín', 'trees', FALSE, 3, TRUE),
('espacios', 'Vista al mar', 'waves', FALSE, 4, TRUE),
('espacios', 'Vista a la ciudad', 'building-2', FALSE, 5, TRUE),
('espacios', 'Vista a la montaña', 'mountain', FALSE, 6, TRUE),
-- Edificio / conjunto
('edificio', 'Piscina', 'waves', FALSE, 1, TRUE),
('edificio', 'Gimnasio', 'dumbbell', FALSE, 2, TRUE),
('edificio', 'Coworking', 'laptop', FALSE, 3, TRUE),
('edificio', 'Ascensor', 'arrow-up', FALSE, 4, TRUE),
('edificio', 'Parqueadero gratuito', 'car', FALSE, 5, TRUE),
('edificio', 'Parqueadero pagado', 'car', TRUE, 6, TRUE),
('edificio', 'Portería 24h', 'shield', FALSE, 7, TRUE),
('edificio', 'Zonas BBQ', 'flame', FALSE, 8, TRUE),
-- Familia
('familia', 'Cuna', 'baby', FALSE, 1, TRUE),
('familia', 'Silla para bebé', 'baby', FALSE, 2, TRUE),
('familia', 'Apto para niños', 'smile', FALSE, 3, TRUE),
-- Seguridad
('seguridad', 'Extintor', 'fire-extinguisher', FALSE, 1, TRUE),
('seguridad', 'Botiquín', 'briefcase-medical', FALSE, 2, TRUE),
('seguridad', 'Detector de humo', 'alert-triangle', FALSE, 3, TRUE),
('seguridad', 'Caja fuerte', 'lock', FALSE, 4, TRUE),
('seguridad', 'Cámaras en zonas comunes', 'cctv', FALSE, 5, TRUE),
-- Accesibilidad
('accesibilidad', 'Entrada sin escalones', 'accessibility', FALSE, 1, TRUE),
('accesibilidad', 'Baño adaptado', 'accessibility', FALSE, 2, TRUE),
('accesibilidad', 'Ascensor hasta el piso', 'arrow-up', FALSE, 3, TRUE),
-- Políticas
('politicas', 'Se admiten mascotas', 'paw-print', FALSE, 1, TRUE),
('politicas', 'Se permite fumar', 'cigarette', FALSE, 2, TRUE),
('politicas', 'Apto para eventos', 'party-popper', FALSE, 3, TRUE)
ON DUPLICATE KEY UPDATE
  category      = VALUES(category),
  icon          = VALUES(icon),
  allows_detail = VALUES(allows_detail),
  sort_order    = VALUES(sort_order),
  is_active     = TRUE;

-- 3) Red de seguridad: cualquier amenidad heredada que siga sin categoría se
--    asigna a 'basicos' para que no desaparezca del selector al agrupar.
UPDATE amenity_catalog
SET category = 'basicos'
WHERE category IS NULL OR category = '';
