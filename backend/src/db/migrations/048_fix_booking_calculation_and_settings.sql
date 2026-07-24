-- ============================================
-- Migración 048: Correcciones críticas de reservas y pagos
-- CONSTRUESCALA Hospitality
--
-- Corrige dos problemas detectados en auditoría:
--
-- 1) sp_create_booking calculaba mal las estancias de más de 30 noches.
--    La versión anterior generaba la serie de fechas con una tabla fija
--    UNION de 0 a 29, así que una reserva de 35 noches solo sumaba 30.
--    Ahora el total se calcula como (noches × precio base) + ajuste por
--    precios especiales, sin generar serie de fechas.
--
-- 2) La configuración estaba hardcodeada pese a existir platform_settings.
--    Ahora sp_create_booking lee booking_expiry_minutes, min_booking_nights
--    y max_booking_nights, y sp_confirm_payment lee default_commission_rate.
-- ============================================

-- --------------------------------------------
-- Función auxiliar: leer un ajuste entero de platform_settings
-- --------------------------------------------
DROP FUNCTION IF EXISTS fn_setting_int;

DELIMITER //

CREATE FUNCTION fn_setting_int(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value INT;

  SELECT ROUND(value_number) INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

DROP FUNCTION IF EXISTS fn_setting_decimal //

CREATE FUNCTION fn_setting_decimal(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value DECIMAL(10,2);

  SELECT value_number INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

DELIMITER ;

-- --------------------------------------------
-- sp_create_booking (corregido)
-- --------------------------------------------
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
  DECLARE v_price_adjustment DECIMAL(10,2);
  DECLARE v_overlapping_count INT;
  DECLARE v_blocked_count INT;
  DECLARE v_max_guests INT;
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_expires_at TIMESTAMP;
  DECLARE v_expiry_minutes INT;
  DECLARE v_min_nights INT;
  DECLARE v_max_nights INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_expiry_minutes = fn_setting_int('booking_expiry_minutes', 15);
  SET v_min_nights     = fn_setting_int('min_booking_nights', 1);
  SET v_max_nights     = fn_setting_int('max_booking_nights', 365);

  START TRANSACTION;

  SELECT base_price_per_night, max_guests INTO v_price_per_night, v_max_guests
  FROM properties
  WHERE id = p_property_id AND status = 'published'
  FOR UPDATE;

  IF v_price_per_night IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Property not found or not published';
  END IF;

  IF p_guests_count > v_max_guests THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Guest count exceeds property maximum';
  END IF;

  IF p_end_date <= p_start_date THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'End date must be after start date';
  END IF;

  IF p_start_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Start date cannot be in the past';
  END IF;

  SET v_total_nights = DATEDIFF(p_end_date, p_start_date);

  IF v_total_nights < v_min_nights THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stay is shorter than the minimum allowed';
  END IF;

  IF v_total_nights > v_max_nights THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stay exceeds the maximum allowed';
  END IF;

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

  SELECT COALESCE(SUM(special_price - v_price_per_night), 0)
    INTO v_price_adjustment
  FROM availability_overrides
  WHERE property_id = p_property_id
    AND special_price IS NOT NULL
    AND date >= p_start_date
    AND date < p_end_date;

  SET v_total_amount = (v_price_per_night * v_total_nights) + v_price_adjustment;

  IF v_total_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Computed total amount is invalid';
  END IF;

  SET v_expires_at = DATE_ADD(NOW(), INTERVAL v_expiry_minutes MINUTE);

  INSERT INTO bookings (
    property_id, guest_id, start_date, end_date, guests_count,
    price_per_night, total_amount, status, expires_at
  ) VALUES (
    p_property_id, p_guest_id, p_start_date, p_end_date, p_guests_count,
    v_price_per_night, v_total_amount, 'pending_payment', v_expires_at
  );

  SET v_booking_id = LAST_INSERT_ID();

  COMMIT;

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
    v_total_nights AS total_nights
  FROM bookings b
  WHERE b.id = v_booking_id;
END //

DELIMITER ;

-- --------------------------------------------
-- sp_confirm_payment (corregido)
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_confirm_payment;

DELIMITER //

CREATE PROCEDURE sp_confirm_payment(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_wompi_transaction_id VARCHAR(100),
    IN p_payment_method VARCHAR(30),
    IN p_raw_payload JSON
)
BEGIN
    DECLARE v_payment_id BIGINT UNSIGNED;
    DECLARE v_property_id BIGINT UNSIGNED;
    DECLARE v_host_id BIGINT UNSIGNED;
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_commission_rate DECIMAL(5,2);
    DECLARE v_commission_amount DECIMAL(10,2);
    DECLARE v_net_amount DECIMAL(10,2);
    DECLARE v_booking_status VARCHAR(30);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      ROLLBACK;
      RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_booking_status
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF v_booking_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La reserva no existe';
    END IF;

    IF v_booking_status <> 'pending_payment' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La reserva no está pendiente de pago';
    END IF;

    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1
    FOR UPDATE;

    IF v_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró pago pendiente para esta reserva';
    END IF;

    UPDATE payments
    SET wompi_transaction_id = p_wompi_transaction_id,
        status = 'approved',
        payment_method = p_payment_method,
        raw_webhook_payload = p_raw_payload
    WHERE id = v_payment_id;

    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = p_booking_id;

    SELECT b.property_id, p.host_id, b.total_amount
    INTO v_property_id, v_host_id, v_total_amount
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = p_booking_id;

    SELECT COALESCE(
             MAX(hp.custom_commission_rate),
             fn_setting_decimal('default_commission_rate', 15.00)
           )
      INTO v_commission_rate
    FROM host_profiles hp
    WHERE hp.user_id = v_host_id;

    SET v_commission_rate = COALESCE(v_commission_rate,
                                     fn_setting_decimal('default_commission_rate', 15.00));

    SET v_commission_amount = ROUND(v_total_amount * v_commission_rate / 100, 2);
    SET v_net_amount = v_total_amount - v_commission_amount;

    INSERT INTO payouts (booking_id, host_id, gross_amount, commission_amount, net_amount, status, created_at)
    VALUES (p_booking_id, v_host_id, v_total_amount, v_commission_amount, v_net_amount, 'pending', NOW());

    COMMIT;

    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS total_amount,
        v_commission_rate AS commission_rate,
        v_commission_amount AS commission_amount,
        v_net_amount AS net_amount;
END //

DELIMITER ;
