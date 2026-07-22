-- ============================================
-- Migración 013: Vista v_property_detail
-- CONSTRUESCALA Hospitality
-- ============================================

DROP VIEW IF EXISTS v_property_detail;

CREATE VIEW v_property_detail AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
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
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pp.id,
      'url', pp.image_url,
      'thumbnail_url', pp.image_url,
      'is_primary', pp.is_primary
    )
    ORDER BY pp.is_primary DESC
  ) FROM property_photos pp WHERE pp.property_id = p.id) AS photos,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pv.id,
      'url', pv.video_url
    )
  ) FROM property_videos pv WHERE pv.property_id = p.id) AS videos
FROM properties p
JOIN users u ON p.host_id = u.id;
