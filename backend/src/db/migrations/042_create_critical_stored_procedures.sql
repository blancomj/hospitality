-- ============================================
-- Migración 042: Stored Procedures críticos
-- CONSTRUESCALA Hospitality
-- Compatible con MariaDB + phpMyAdmin
-- Ejecutar cada procedure por separado
-- ============================================


-- =============================================
-- 1. sp_upsert_firebase_user
-- =============================================
DROP PROCEDURE IF EXISTS sp_upsert_firebase_user;

CREATE PROCEDURE sp_upsert_firebase_user(
  IN p_firebase_uid VARCHAR(64),
  IN p_email VARCHAR(255),
  IN p_full_name VARCHAR(150),
  IN p_avatar_url VARCHAR(500)
)
BEGIN
  DECLARE v_user_id BIGINT UNSIGNED;

  SELECT id INTO v_user_id
  FROM users
  WHERE firebase_uid = p_firebase_uid
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE users
      SET firebase_uid = p_firebase_uid,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    INSERT INTO users (firebase_uid, email, full_name, avatar_url, role)
    VALUES (p_firebase_uid, p_email, p_full_name, p_avatar_url, 'guest');
    SET v_user_id = LAST_INSERT_ID();
  ELSE
    UPDATE users
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;

  SELECT id, firebase_uid, google_id, email, full_name, avatar_url,
         role, phone, locale, status, id_verified, fast_response,
         created_at, updated_at
  FROM users
  WHERE id = v_user_id;
END;


-- =============================================
-- 2. sp_get_host_calendar
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_host_calendar;

CREATE PROCEDURE sp_get_host_calendar(
  IN p_host_id BIGINT UNSIGNED,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  WITH cal AS (
    SELECT DATE_ADD(p_from_date, INTERVAL seq DAY) AS dt
    FROM (
      SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
      UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
      UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
      UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
    ) dates
    WHERE DATE_ADD(p_from_date, INTERVAL seq DAY) <= p_to_date
  )
  SELECT
    p.id AS property_id,
    p.title AS property_title,
    cal.dt AS `date`,
    CASE
      WHEN b.id IS NOT NULL THEN b.status
      WHEN ao.is_blocked = 1 THEN 'blocked'
      ELSE 'available'
    END AS status,
    b.id AS booking_id,
    u.full_name AS guest_name,
    COALESCE(ao.is_blocked, 0) AS is_blocked,
    ao.special_price
  FROM properties p
  CROSS JOIN cal
  LEFT JOIN bookings b ON p.id = b.property_id
    AND b.start_date <= cal.dt
    AND b.end_date > cal.dt
    AND b.status IN ('confirmed', 'completed')
  LEFT JOIN users u ON b.guest_id = u.id
  LEFT JOIN availability_overrides ao ON p.id = ao.property_id AND ao.date = cal.dt
  WHERE p.host_id = p_host_id
  ORDER BY p.id, cal.dt;
END;


-- =============================================
-- 3. sp_search_properties
-- =============================================
DROP PROCEDURE IF EXISTS sp_search_properties;

CREATE PROCEDURE sp_search_properties(
  IN p_city VARCHAR(100),
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_guests INT,
  IN p_min_price DECIMAL(10,2),
  IN p_max_price DECIMAL(10,2),
  IN p_type VARCHAR(50),
  IN p_amenities VARCHAR(500)
)
BEGIN
  SELECT
    vsp.*,
    (SELECT COUNT(*) FROM availability_overrides ao
     WHERE ao.property_id = vsp.id AND ao.is_blocked = TRUE
     AND ao.date BETWEEN COALESCE(p_start_date, '2000-01-01') AND COALESCE(p_end_date, '2099-12-31')
    ) AS blocked_dates_count
  FROM v_search_properties vsp
  WHERE vsp.status = 'published'
    AND (p_city IS NULL OR vsp.city = p_city)
    AND (p_guests IS NULL OR vsp.max_guests >= p_guests)
    AND (p_min_price IS NULL OR vsp.base_price_per_night >= p_min_price)
    AND (p_max_price IS NULL OR vsp.base_price_per_night <= p_max_price)
    AND (p_type IS NULL OR vsp.property_type = p_type)
    AND (p_start_date IS NULL OR p_end_date IS NULL
         OR vsp.id NOT IN (
           SELECT property_id FROM bookings
           WHERE status IN ('confirmed', 'pending_payment')
           AND start_date < p_end_date AND end_date > p_start_date
         ))
    AND (p_amenities IS NULL OR LENGTH(p_amenities) = 0
         OR vsp.id IN (
           SELECT property_id FROM property_amenities
           WHERE FIND_IN_SET(amenity_id, p_amenities) > 0
           GROUP BY property_id
           HAVING COUNT(DISTINCT amenity_id) = LENGTH(p_amenities) - LENGTH(REPLACE(p_amenities, ',', '')) + 1
         ))
  ORDER BY vsp.base_price_per_night ASC;
END;


-- =============================================
-- 4. sp_get_my_properties
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_my_properties;

CREATE PROCEDURE sp_get_my_properties(
  IN p_host_id BIGINT UNSIGNED
)
BEGIN
  SELECT p.*,
    (SELECT image_url FROM property_photos pp
     WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1
    ) AS main_photo_url
  FROM properties p
  WHERE p.host_id = p_host_id
  ORDER BY p.created_at DESC;
END;


-- =============================================
-- 5. sp_get_host_bookings
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_host_bookings;

CREATE PROCEDURE sp_get_host_bookings(
  IN p_host_id BIGINT UNSIGNED,
  IN p_status VARCHAR(30)
)
BEGIN
  SELECT
    b.id AS booking_id,
    b.property_id,
    p.title AS property_title,
    p.city AS property_city,
    u.full_name AS guest_name,
    u.email AS guest_email,
    u.phone AS guest_phone,
    b.start_date,
    b.end_date,
    b.guests_count,
    b.total_amount,
    b.status,
    b.created_at
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN users u ON b.guest_id = u.id
  WHERE p.host_id = p_host_id
    AND (p_status IS NULL OR LENGTH(p_status) = 0 OR b.status = p_status)
  ORDER BY b.start_date DESC;
END;


-- =============================================
-- 6. sp_get_host_finances
-- =============================================
DROP PROCEDURE IF EXISTS sp_get_host_finances;

CREATE PROCEDURE sp_get_host_finances(
  IN p_host_id BIGINT UNSIGNED,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    py.id AS payout_id,
    py.booking_id,
    p.title AS property_title,
    p.city AS property_city,
    b.start_date AS check_in,
    b.end_date AS check_out,
    py.gross_amount,
    py.commission_amount,
    py.net_amount,
    py.status,
    py.wompi_payout_reference,
    py.paid_at,
    py.created_at
  FROM payouts py
  JOIN bookings b ON py.booking_id = b.id
  JOIN properties p ON b.property_id = p.id
  WHERE py.host_id = p_host_id
    AND (p_from_date IS NULL OR py.created_at >= p_from_date)
    AND (p_to_date IS NULL OR py.created_at <= CONCAT(p_to_date, ' 23:59:59'))
  ORDER BY py.created_at DESC;
END;
