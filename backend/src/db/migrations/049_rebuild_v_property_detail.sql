-- ============================================
-- Migración 049: Reconstrucción de v_property_detail
-- CONSTRUESCALA Hospitality
--
-- La migración 046 agregó a las tablas los campos de ubicación, capacidad y
-- media (neighborhood, beds, area_m2, show_exact_location, directions_note,
-- area_note, property_photos.thumbnail_url, property_photos.sort_order,
-- property_videos.source, property_videos.thumbnail_url), pero la vista
-- v_property_detail siguió siendo la de la migración 013 y nunca los expuso.
--
-- Consecuencia: la ficha de propiedad y el editor del propietario no podían
-- leer el barrio, las camas, el área, el tipo de alojamiento ni la
-- configuración de privacidad de la ubicación, aunque estuvieran guardados.
--
-- Además la vista devolvía image_url como miniatura, así que las cuadrículas
-- de fotos cargaban siempre la imagen a tamaño completo, y ordenaba solo por
-- is_primary, ignorando sort_order.
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
  p.neighborhood,
  p.address,
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
  p.ical_export_token,
  p.created_at,
  p.updated_at,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pp.id,
      'url', pp.image_url,
      -- Si la miniatura existe se usa; si no, se cae a la imagen completa
      -- para no romper las fotos subidas antes de esta corrección.
      'thumbnail_url', COALESCE(pp.thumbnail_url, pp.image_url),
      'is_primary', pp.is_primary,
      'sort_order', pp.sort_order
    )
    ORDER BY pp.is_primary DESC, pp.sort_order ASC, pp.id ASC
  ) FROM property_photos pp WHERE pp.property_id = p.id) AS photos,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pv.id,
      'source', COALESCE(pv.source, 'upload'),
      'url', pv.video_url,
      'thumbnail_url', pv.thumbnail_url
    )
  ) FROM property_videos pv WHERE pv.property_id = p.id) AS videos,
  (SELECT COUNT(*) FROM property_photos pp2 WHERE pp2.property_id = p.id) AS photo_count
FROM properties p
JOIN users u ON p.host_id = u.id;
