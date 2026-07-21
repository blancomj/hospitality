-- ============================================
-- Migración 017: sp_create_booking
-- El SP más crítico del sistema: prevención de doble reserva
-- CONSTRUESCALA Hospitality
-- ============================================

DROP PROCEDURE IF EXISTS sp_create_booking;

DELIMITER //

CREATE PROCEDURE sp_create_booking(
  IN p_property_id BIGINT UNSIGNED,
  IN p_guest_id BIGINT UNSIGNED,
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_guests_count SMALLINT UNSIGNED
)
BEGIN
  DECLARE v_price_per_night DECIMAL(10,2);
  DECLARE v_total_nights INT;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_overlapping_count INT;
  DECLARE v_blocked_count INT;
  DECLARE v_max_guests INT;
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_expires_at TIMESTAMP;
  
  -- Exit handler for SQL exceptions
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Start transaction
  START TRANSACTION;

  -- 1. Verify property exists and is published
  SELECT base_price_per_night, max_guests INTO v_price_per_night, v_max_guests
  FROM properties
  WHERE id = p_property_id AND status = 'published'
  FOR UPDATE;

  IF v_price_per_night IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Property not found or not published';
  END IF;

  -- 2. Validate guests count
  IF p_guests_count > v_max_guests THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Guest count exceeds property maximum';
  END IF;

  -- 3. Validate dates
  IF p_end_date <= p_start_date THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'End date must be after start date';
  END IF;

  -- 4. Check for overlapping confirmed/pending bookings (SELECT ... FOR UPDATE)
  SELECT COUNT(*) INTO v_overlapping_count
  FROM bookings
  WHERE property_id = p_property_id
    AND status IN ('confirmed', 'pending_payment')
    AND start_date < p_end_date
    AND end_date > p_start_date
  FOR UPDATE;

  IF v_overlapping_count > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Property is not available for the selected dates';
  END IF;

  -- 5. Check for blocked dates in availability_overrides
  SELECT COUNT(*) INTO v_blocked_count
  FROM availability_overrides
  WHERE property_id = p_property_id
    AND is_blocked = TRUE
    AND date >= p_start_date
    AND date < p_end_date;

  IF v_blocked_count > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Some dates are blocked by the host';
  END IF;

  -- 6. Calculate total amount (base price + special prices)
  SET v_total_nights = DATEDIFF(p_end_date, p_start_date);
  
  SELECT COALESCE(SUM(
    CASE 
      WHEN ao.special_price IS NOT NULL THEN ao.special_price
      ELSE v_price_per_night
    END
  ), v_price_per_night * v_total_nights) INTO v_total_amount
  FROM (
    SELECT DATE_ADD(p_start_date, INTERVAL n DAY) AS check_date
    FROM (
      SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
      UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
      UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
      UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
    ) numbers
    WHERE DATE_ADD(p_start_date, INTERVAL n DAY) < p_end_date
  ) dates
  LEFT JOIN availability_overrides ao 
    ON ao.property_id = p_property_id 
    AND ao.date = dates.check_date;

  -- 7. Set expiration (15 minutes from now)
  SET v_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE);

  -- 8. Insert the booking
  INSERT INTO bookings (
    property_id, guest_id, start_date, end_date, guests_count,
    price_per_night, total_amount, status, expires_at
  ) VALUES (
    p_property_id, p_guest_id, p_start_date, p_end_date, p_guests_count,
    v_price_per_night, v_total_amount, 'pending_payment', v_expires_at
  );

  SET v_booking_id = LAST_INSERT_ID();

  -- 9. Commit transaction
  COMMIT;

  -- 10. Return booking details
  SELECT 
    b.id AS booking_id,
    b.property_id,
    b.start_date,
    b.end_date,
    b.guests_count,
    b.price_per_night,
    b.total_amount,
    b.status,
    b.expires_at,
    b.created_at,
    p.title AS property_title,
    p.city AS property_city
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = v_booking_id;

END //

DELIMITER ;
