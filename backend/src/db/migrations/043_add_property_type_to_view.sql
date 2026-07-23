-- ============================================
-- Migración 043: Agregar property_type a v_search_properties
-- CONSTRUESCALA Hospitality
-- ============================================

DROP VIEW IF EXISTS v_search_properties;

CREATE VIEW v_search_properties AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.property_type,
  p.city,
  p.country,
  p.address,
  p.latitude,
  p.longitude,
  p.max_guests,
  p.bedrooms,
  p.bathrooms,
  p.base_price_per_night,
  p.cancellation_policy,
  p.status,
  p.created_at,
  p.updated_at,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT image_url FROM property_photos pp WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
  (SELECT image_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
WHERE p.status = 'published';
