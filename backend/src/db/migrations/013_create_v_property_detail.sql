-- ============================================
-- Migración 013: Vista v_property_detail
-- CONSTRUESCALA Hospitality
-- Vista completa para ficha de propiedad
-- ============================================

DROP VIEW IF EXISTS v_property_detail;

CREATE VIEW v_property_detail AS
SELECT 
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.city,
  p.address,
  p.neighborhood,
  p.latitude,
  p.longitude,
  p.show_exact_location,
  p.directions_note,
  p.area_note,
  p.property_type,
  p.max_guests,
  p.bedrooms,
  p.beds,
  p.bathrooms,
  p.area_m2,
  p.base_price_per_night,
  p.cancellation_policy,
  p.status,
  p.avg_rating,
  p.review_count,
  p.ical_export_token,
  p.created_at,
  p.updated_at,
  -- Datos del propietario
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  u.id_verified AS host_id_verified,
  u.fast_response AS host_fast_response,
  hp.commission_rate,
  -- Fotos ordenadas
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pp.id,
      'url', pp.url,
      'thumbnail_url', pp.thumbnail_url,
      'sort_order', pp.sort_order
    )
    ORDER BY pp.sort_order ASC
  ) FROM property_photos pp WHERE pp.property_id = p.id) AS photos,
  -- Videos ordenados
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pv.id,
      'source', pv.source,
      'url', pv.url,
      'thumbnail_url', pv.thumbnail_url,
      'duration_seconds', pv.duration_seconds,
      'sort_order', pv.sort_order
    )
    ORDER BY pv.sort_order ASC
  ) FROM property_videos pv WHERE pv.property_id = p.id) AS videos,
  -- Amenidades con detalle
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', ac.id,
      'category', ac.category,
      'name', ac.name,
      'icon', ac.icon,
      'detail', pa.detail
    )
    ORDER BY ac.category, ac.sort_order
  ) FROM property_amenities pa
  JOIN amenity_catalog ac ON pa.amenity_id = ac.id
  WHERE pa.property_id = p.id AND ac.is_active = TRUE) AS amenities,
  -- Traducciones disponibles
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'locale', pt.locale,
      'title', pt.title,
      'description', pt.description,
      'is_auto_translated', pt.is_auto_translated
    )
  ) FROM property_translations pt WHERE pt.property_id = p.id) AS translations
FROM properties p
JOIN users u ON p.host_id = u.id
LEFT JOIN host_profiles hp ON p.host_id = hp.user_id;
