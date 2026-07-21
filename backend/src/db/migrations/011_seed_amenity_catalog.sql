-- ============================================
-- Migración 011: Seed del catálogo de amenidades
-- CONSTRUESCALA Hospitality
-- Datos iniciales basados en el documento de casos de uso
-- ============================================

INSERT INTO amenity_catalog (category, name, icon, allows_detail, sort_order) VALUES
-- Básicos
('basicos', 'Wifi', 'wifi', TRUE, 1),
('basicos', 'TV', 'tv', FALSE, 2),
('basicos', 'Aire acondicionado', 'wind', FALSE, 3),
('basicos', 'Ventilador', 'fan', FALSE, 4),
('basicos', 'Agua caliente', 'thermometer', FALSE, 5),
('basicos', 'Closet', 'door-open', FALSE, 6),

-- Cocina
('cocina', 'Cocina completa', 'chef-hat', FALSE, 1),
('cocina', 'Nevera', 'refrigerator', FALSE, 2),
('cocina', 'Estufa', 'flame', FALSE, 3),
('cocina', 'Horno', 'oven', FALSE, 4),
('cocina', 'Microondas', 'microwave', FALSE, 5),
('cocina', 'Cafetera', 'coffee', FALSE, 6),
('cocina', 'Licuadora', 'blender', FALSE, 7),
('cocina', 'Vajilla y utensilios', 'utensils', FALSE, 8),

-- Lavandería
('lavanderia', 'Lavadora', 'washing-machine', FALSE, 1),
('lavanderia', 'Secadora', 'shirt', FALSE, 2),
('lavanderia', 'Plancha', 'iron', FALSE, 3),
('lavanderia', 'Servicio de lavandería', 'sparkles', FALSE, 4),

-- Espacios
('espacios', 'Balcón', 'fence', FALSE, 1),
('espacios', 'Terraza', 'sun', FALSE, 2),
('espacios', 'Jardín', 'trees', FALSE, 3),
('espacios', 'Vista al mar', 'waves', FALSE, 4),
('espacios', 'Vista a la ciudad', 'building', FALSE, 5),
('espacios', 'Vista a la montaña', 'mountain', FALSE, 6),

-- Edificio/conjunto
('edificio', 'Piscina', 'waves', FALSE, 1),
('edificio', 'Gimnasio', 'dumbbell', FALSE, 2),
('edificio', 'Coworking', 'laptop', FALSE, 3),
('edificio', 'Ascensor', 'arrow-up', FALSE, 4),
('edificio', 'Parqueadero gratuito', 'car', FALSE, 5),
('edificio', 'Parqueadero pagado', 'car', TRUE, 6),
('edificio', 'Portería 24h', 'shield', FALSE, 7),
('edificio', 'Zonas BBQ', 'flame', FALSE, 8),

-- Familia
('familia', 'Cuna', 'baby', FALSE, 1),
('familia', 'Silla para bebé', 'baby', FALSE, 2),
('familia', 'Apto para niños', 'smile', FALSE, 3),

-- Seguridad
('seguridad', 'Extintor', 'flame', FALSE, 1),
('seguridad', 'Botiquín', 'first-aid', FALSE, 2),
('seguridad', 'Detector de humo', 'alert-triangle', FALSE, 3),
('seguridad', 'Caja fuerte', 'lock', FALSE, 4),
('seguridad', 'Cámaras en zonas comunes', 'camera', FALSE, 5),

-- Accesibilidad
('accesibilidad', 'Entrada sin escalones', 'accessibility', FALSE, 1),
('accesibilidad', 'Baño adaptado', 'accessibility', FALSE, 2),
('accesibilidad', 'Ascensor hasta el piso', 'arrow-up', FALSE, 3),

-- Políticas
('politicas', 'Se admiten mascotas', 'paw-print', FALSE, 1),
('politicas', 'Se permite fumar', 'cigarette', FALSE, 2),
('politicas', 'Apto para eventos', 'party-popper', FALSE, 3)
ON DUPLICATE KEY UPDATE icon = VALUES(icon);
