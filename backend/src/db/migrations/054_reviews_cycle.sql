-- ============================================
-- Migración 054: Cerrar el ciclo de reseñas (CU-21 / CU-22)
-- CONSTRUESCALA Hospitality
--
-- Situación antes de esta migración:
--
-- * La 053 añadió properties.avg_rating y properties.review_count, pero NADIE
--   las escribe: ni un procedimiento, ni un trigger. Se quedan en NULL / 0
--   para siempre.
-- * Ninguna vista las expone, así que aunque tuvieran valor no llegarían al
--   frontend. PropertyCard.vue y PropertyDetailView.vue ya las pintan
--   (`property.avg_rating.toFixed(1)`), guardadas tras un `v-if="avg_rating > 0"`
--   que nunca se cumple: la calificación simplemente no aparece nunca.
-- * sp_reply_review existe y funciona; POST /reviews/:id/reply está
--   implementado. Pero no hay forma de listar las reseñas de un propietario,
--   así que el panel muestra "N reseñas sin responder" y no ofrece dónde
--   responderlas.
--
-- Esta migración cierra las tres puntas.
--
-- Idempotente: DROP ... IF EXISTS + CREATE.
-- ============================================

-- --------------------------------------------
-- 1. sp_create_review: mantener el agregado de calificación
-- --------------------------------------------
-- Se recalcula desde reviews en vez de llevar un contador incremental: es
-- inmune a reseñas borradas o corregidas, y con el volumen de este negocio el
-- coste es irrelevante.
DROP PROCEDURE IF EXISTS sp_create_review;

DELIMITER //

CREATE PROCEDURE sp_create_review(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_guest_id BIGINT UNSIGNED,
  IN p_rating TINYINT UNSIGNED,
  IN p_comment TEXT
)
BEGIN
  DECLARE v_property_id BIGINT UNSIGNED;
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_existing_review BIGINT UNSIGNED;

  -- La reserva debe existir, pertenecer al huésped y estar completada
  SELECT property_id, status INTO v_property_id, v_booking_status
  FROM bookings
  WHERE id = p_booking_id
    AND guest_id = p_guest_id;

  IF v_property_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Reserva no encontrada o no pertenece al huésped';
  END IF;

  IF v_booking_status <> 'completed' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solo se pueden reseñar reservas completadas';
  END IF;

  SELECT id INTO v_existing_review
  FROM reviews
  WHERE booking_id = p_booking_id;

  IF v_existing_review IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Ya existe una reseña para esta reserva';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El rating debe ser entre 1 y 5';
  END IF;

  INSERT INTO reviews (booking_id, property_id, guest_id, rating, comment, created_at)
  VALUES (p_booking_id, v_property_id, p_guest_id, p_rating, p_comment, NOW());

  -- Recalcular el agregado de la propiedad
  UPDATE properties p
  SET p.avg_rating = (
        SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.property_id = v_property_id
      ),
      p.review_count = (
        SELECT COUNT(*) FROM reviews r WHERE r.property_id = v_property_id
      )
  WHERE p.id = v_property_id;

  SELECT
    LAST_INSERT_ID() AS review_id,
    p_booking_id     AS booking_id,
    v_property_id    AS property_id,
    p_rating         AS rating,
    p_comment        AS comment;
END //

DELIMITER ;

-- --------------------------------------------
-- 2. sp_get_host_reviews: listar las reseñas del propietario
-- --------------------------------------------
-- El aislamiento va por p_host_id, que el backend inyecta desde el token,
-- nunca desde parámetros del cliente (misma regla que el resto del panel).
DROP PROCEDURE IF EXISTS sp_get_host_reviews;

DELIMITER //

CREATE PROCEDURE sp_get_host_reviews(
  IN p_host_id BIGINT UNSIGNED,
  IN p_only_unanswered TINYINT
)
BEGIN
  SELECT
    r.id                AS review_id,
    r.property_id,
    p.title             AS property_title,
    p.city              AS property_city,
    r.booking_id,
    b.start_date,
    b.end_date,
    r.rating,
    r.comment,
    r.host_reply,
    r.host_reply IS NULL AS is_unanswered,
    r.created_at,
    r.updated_at,
    u.full_name         AS guest_name,
    u.avatar_url        AS guest_avatar
  FROM reviews r
  JOIN properties p ON r.property_id = p.id
  JOIN users u      ON r.guest_id = u.id
  JOIN bookings b   ON r.booking_id = b.id
  WHERE p.host_id = p_host_id
    AND (p_only_unanswered = 0 OR r.host_reply IS NULL)
  ORDER BY (r.host_reply IS NULL) DESC, r.created_at DESC;
END //

DELIMITER ;

-- --------------------------------------------
-- 3. Exponer la calificación en las vistas
-- --------------------------------------------
-- Sin esto el frontend nunca recibe avg_rating ni review_count, por muy bien
-- que se mantengan en la tabla.

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
  COALESCE(p.avg_rating, 0)   AS avg_rating,
  COALESCE(p.review_count, 0) AS review_count,
  p.created_at,
  p.updated_at,
  u.full_name  AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT pp.image_url FROM property_photos pp
    WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
  (SELECT pp.image_url FROM property_photos pp
    WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
WHERE p.status = 'published';

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
  COALESCE(p.avg_rating, 0)   AS avg_rating,
  COALESCE(p.review_count, 0) AS review_count,
  p.created_at,
  p.updated_at,
  u.full_name  AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pp.id,
      'url', pp.image_url,
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

-- --------------------------------------------
-- 4. Rellenar el agregado con las reseñas ya existentes
-- --------------------------------------------
UPDATE properties p
LEFT JOIN (
  SELECT property_id,
         ROUND(AVG(rating), 2) AS media,
         COUNT(*)              AS total
  FROM reviews
  GROUP BY property_id
) r ON r.property_id = p.id
SET p.avg_rating   = r.media,
    p.review_count = COALESCE(r.total, 0);
