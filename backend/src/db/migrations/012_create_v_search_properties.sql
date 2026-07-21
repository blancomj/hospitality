-- ============================================
-- Migración 012: Vista v_search_properties
-- CONSTRUESCALA Hospitality
-- Vista optimizada para búsqueda de propiedades
-- ============================================

DROP VIEW IF EXISTS v_search_properties;

CREATE VIEW v_search_properties AS
SELECT 
  p.id,
  p.host_id,
  p.title,
  p.city,
  p.neighborhood,
  p.property_type,
  p.max_guests,
  p.bedrooms,
  p.beds,
  p.bathrooms,
  p.area_m2,
  p.base_price_per_night,
  p.status,
  p.avg_rating,
  p.review_count,
  p.latitude,
  p.longitude,
  p.show_exact_location,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  hp.commission_rate,
  -- Foto principal (primera foto por sort_order)
  (SELECT url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.sort_order ASC LIMIT 1) AS main_photo_url,
  (SELECT thumbnail_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.sort_order ASC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
LEFT JOIN host_profiles hp ON p.host_id = hp.user_id
WHERE p.status = 'published';
