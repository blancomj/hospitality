-- =========================================================
-- Archivo temporal consolidado de procedimientos almacenados
-- Generado a partir de las migraciones del proyecto
-- =========================================================

USE u434343788_escala;

-- =========================================================
-- 003: sp_upsert_google_user
-- =========================================================

DROP PROCEDURE IF EXISTS sp_upsert_google_user;

DELIMITER //

CREATE PROCEDURE sp_upsert_google_user(
  IN p_google_id VARCHAR(64),
  IN p_email VARCHAR(255),
  IN p_full_name VARCHAR(150),
  IN p_avatar_url VARCHAR(500)
)
BEGIN
  DECLARE v_user_id BIGINT UNSIGNED;
  
  SELECT id INTO v_user_id 
  FROM users 
  WHERE google_id = p_google_id 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = p_email 
    LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
      UPDATE users 
      SET google_id = p_google_id,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;
  
  IF v_user_id IS NULL THEN
    INSERT INTO users (google_id, email, full_name, avatar_url, role)
    VALUES (p_google_id, p_email, p_full_name, p_avatar_url, 'guest');
    
    SET v_user_id = LAST_INSERT_ID();
  ELSE
    UPDATE users 
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;
  
  SELECT 
    id,
    google_id,
    email,
    full_name,
    avatar_url,
    role,
    phone,
    locale,
    status,
    id_verified,
    fast_response,
    created_at,
    updated_at
  FROM users 
  WHERE id = v_user_id;
  
END //

DELIMITER ;

-- =========================================================
-- 017: sp_create_booking
-- =========================================================

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
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

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

  SET v_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE);

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
    b.created_at,
    p.title AS property_title,
    p.city AS property_city
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = v_booking_id;

END //

DELIMITER ;

-- =========================================================
-- 018: sp_cancel_booking
-- =========================================================

DROP PROCEDURE IF EXISTS sp_cancel_booking;

DELIMITER //

CREATE PROCEDURE sp_cancel_booking(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED,
  IN p_reason TEXT
)
BEGIN
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_property_id BIGINT UNSIGNED;
  DECLARE v_guest_id BIGINT UNSIGNED;
  DECLARE v_host_id BIGINT UNSIGNED;
  DECLARE v_start_date DATE;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_cancellation_policy VARCHAR(20);
  DECLARE v_days_until_checkin INT;
  DECLARE v_refund_percentage DECIMAL(5,2);
  DECLARE v_refund_amount DECIMAL(10,2);
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT 
    b.status, b.property_id, b.guest_id, b.start_date, b.total_amount,
    p.cancellation_policy, p.host_id
  INTO 
    v_booking_status, v_property_id, v_guest_id, v_start_date, v_total_amount,
    v_cancellation_policy, v_host_id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  IF v_guest_id != p_user_id AND v_host_id != p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to cancel this booking';
    END IF;
  END IF;

  IF v_booking_status NOT IN ('pending_payment', 'confirmed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking cannot be cancelled in its current status';
  END IF;

  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());
  
  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      IF v_days_until_checkin >= 1 THEN
        SET v_refund_percentage = 100.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    WHEN 'moderada' THEN
      IF v_days_until_checkin >= 5 THEN
        SET v_refund_percentage = 100.00;
      ELSEIF v_days_until_checkin >= 3 THEN
        SET v_refund_percentage = 50.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    WHEN 'estricta' THEN
      IF v_days_until_checkin >= 7 THEN
        SET v_refund_percentage = 50.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SET v_refund_amount = ROUND(v_total_amount * v_refund_percentage / 100, 2);

  UPDATE bookings 
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = p_user_id,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  IF v_refund_amount > 0 THEN
    UPDATE payments 
    SET status = 'refunded'
    WHERE booking_id = p_booking_id AND status = 'approved';
  END IF;

  UPDATE payouts 
  SET status = 'failed'
  WHERE booking_id = p_booking_id AND status IN ('pending', 'processing');

  COMMIT;

  SELECT 
    b.id AS booking_id,
    b.status,
    b.cancellation_reason,
    b.cancelled_at,
    v_refund_amount AS refund_amount,
    v_refund_percentage AS refund_percentage,
    v_cancellation_policy AS policy_applied,
    v_days_until_checkin AS days_until_checkin
  FROM bookings b
  WHERE b.id = p_booking_id;

END //

DELIMITER ;

-- =========================================================
-- 019: sp_expire_pending_bookings
-- =========================================================

DROP PROCEDURE IF EXISTS sp_expire_pending_bookings;

DELIMITER //

CREATE PROCEDURE sp_expire_pending_bookings()
BEGIN
  DECLARE v_expired_count INT DEFAULT 0;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO v_expired_count
  FROM bookings
  WHERE status = 'pending_payment'
    AND expires_at < NOW();

  UPDATE bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'Payment timeout - booking expired',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending_payment'
    AND expires_at < NOW();

  COMMIT;

  SELECT v_expired_count AS expired_count;

END //

DELIMITER ;

-- =========================================================
-- 021: sp_create_payment_intent
-- =========================================================

DROP PROCEDURE IF EXISTS sp_create_payment_intent;

DELIMITER //

CREATE PROCEDURE sp_create_payment_intent(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_user_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_payment_id BIGINT UNSIGNED;
    DECLARE v_reference VARCHAR(50);
    DECLARE v_existing_payment_id BIGINT UNSIGNED;

    SELECT id INTO v_existing_payment_id
    FROM bookings
    WHERE id = p_booking_id
      AND guest_id = p_user_id
      AND status = 'pending_payment'
      AND expires_at > NOW();

    IF v_existing_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reserva no encontrada, no está en pending_payment, o ha expirado';
    END IF;

    SELECT total_amount INTO v_total_amount
    FROM bookings
    WHERE id = p_booking_id;

    SET v_reference = CONCAT('CS-', p_booking_id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'));

    INSERT INTO payments (booking_id, amount, status, created_at)
    VALUES (p_booking_id, v_total_amount, 'pending', NOW());

    SET v_payment_id = LAST_INSERT_ID();

    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS amount,
        v_reference AS reference,
        'COP' AS currency;
END //

DELIMITER ;

-- =========================================================
-- 022: sp_confirm_payment
-- =========================================================

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

    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1;

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

    SELECT COALESCE(hp.custom_commission_rate, 15.00) INTO v_commission_rate
    FROM host_profiles hp
    WHERE hp.user_id = v_host_id;

    SET v_commission_amount = ROUND(v_total_amount * v_commission_rate / 100, 2);
    SET v_net_amount = v_total_amount - v_commission_amount;

    INSERT INTO payouts (booking_id, host_id, gross_amount, commission_amount, net_amount, status, created_at)
    VALUES (p_booking_id, v_host_id, v_total_amount, v_commission_amount, v_net_amount, 'pending', NOW());

    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS total_amount,
        v_commission_amount AS commission_amount,
        v_net_amount AS net_amount;
END //

DELIMITER ;

-- =========================================================
-- 023: sp_process_refund
-- =========================================================

DROP PROCEDURE IF EXISTS sp_process_refund;

DELIMITER //

CREATE PROCEDURE sp_process_refund(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_refund_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_payment_id BIGINT UNSIGNED;
    DECLARE v_payout_id BIGINT UNSIGNED;

    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'approved'
    LIMIT 1;

    IF v_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró pago aprobado para esta reserva';
    END IF;

    UPDATE payments
    SET status = 'refunded'
    WHERE id = v_payment_id;

    UPDATE bookings
    SET status = 'refunded'
    WHERE id = p_booking_id;

    SELECT id INTO v_payout_id
    FROM payouts
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1;

    IF v_payout_id IS NOT NULL THEN
        UPDATE payouts
        SET status = 'failed'
        WHERE id = v_payout_id;
    END IF;

    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        p_refund_amount AS refund_amount;
END //

DELIMITER ;

-- =========================================================
-- 024: sp_expire_pending_payments
-- =========================================================

DROP PROCEDURE IF EXISTS sp_expire_pending_payments;

DELIMITER //

CREATE PROCEDURE sp_expire_pending_payments()
BEGIN
    DECLARE v_expired_count INT DEFAULT 0;

    UPDATE bookings
    SET status = 'expired'
    WHERE status = 'pending_payment'
      AND expires_at < NOW();

    SET v_expired_count = ROW_COUNT();

    DELETE p FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE b.status = 'expired'
      AND p.status = 'pending';

    SELECT v_expired_count AS expired_bookings;
END //

DELIMITER ;

-- =========================================================
-- 025: sp_approve_host
-- =========================================================

DROP PROCEDURE IF EXISTS sp_approve_host;

DELIMITER //

CREATE PROCEDURE sp_approve_host(
    IN p_user_id BIGINT UNSIGNED,
    IN p_action ENUM('approve', 'reject'),
    IN p_admin_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_new_status VARCHAR(20);

    SELECT approval_status INTO v_current_status
    FROM host_profiles
    WHERE user_id = p_user_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró perfil de propietario';
    END IF;

    IF v_current_status != 'pending_approval' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El propietario ya fue procesado anteriormente';
    END IF;

    IF p_action = 'approve' THEN
        SET v_new_status = 'approved';
    ELSE
        SET v_new_status = 'rejected';
    END IF;

    UPDATE host_profiles
    SET approval_status = v_new_status,
        approved_by = p_admin_id,
        approved_at = NOW()
    WHERE user_id = p_user_id;

    SELECT
        p_user_id AS user_id,
        v_new_status AS new_status,
        p_admin_id AS approved_by;
END //

DELIMITER ;

-- =========================================================
-- 026: sp_run_payouts
-- =========================================================

DROP PROCEDURE IF EXISTS sp_run_payouts;

DELIMITER //

CREATE PROCEDURE sp_run_payouts()
BEGIN
    DECLARE v_payout_count INT DEFAULT 0;

    UPDATE payouts p
    JOIN bookings b ON p.booking_id = b.id
    SET p.status = 'processing'
    WHERE p.status = 'pending'
      AND b.status = 'confirmed'
      AND b.start_date <= CURDATE();

    SET v_payout_count = ROW_COUNT();

    SELECT
        p.id AS payout_id,
        p.host_id,
        p.gross_amount,
        p.commission_amount,
        p.net_amount,
        u.full_name AS host_name,
        u.email AS host_email,
        hp.bank_name,
        hp.bank_account_number,
        hp.bank_account_type
    FROM payouts p
    JOIN users u ON p.host_id = u.id
    JOIN host_profiles hp ON p.host_id = hp.user_id
    WHERE p.status = 'processing';
END //

DELIMITER ;

-- =========================================================
-- 028: sp_create_review
-- =========================================================

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
    DECLARE v_guest_checkin DATE;
    DECLARE v_existing_review BIGINT UNSIGNED;

    SELECT property_id, status, end_date INTO v_property_id, v_booking_status, v_guest_checkin
    FROM bookings
    WHERE id = p_booking_id
      AND guest_id = p_guest_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reserva no encontrada o no pertenece al huésped';
    END IF;

    IF v_booking_status != 'completed' THEN
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

    SELECT
        LAST_INSERT_ID() AS review_id,
        p_booking_id AS booking_id,
        v_property_id AS property_id,
        p_rating AS rating,
        p_comment AS comment;
END //

DELIMITER ;

-- =========================================================
-- 029: sp_reply_review
-- =========================================================

DROP PROCEDURE IF EXISTS sp_reply_review;

DELIMITER //

CREATE PROCEDURE sp_reply_review(
    IN p_review_id BIGINT UNSIGNED,
    IN p_host_id BIGINT UNSIGNED,
    IN p_reply TEXT
)
BEGIN
    DECLARE v_host_owner BIGINT UNSIGNED;

    SELECT pr.host_id INTO v_host_owner
    FROM reviews r
    JOIN properties pr ON r.property_id = pr.id
    WHERE r.id = p_review_id;

    IF v_host_owner IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reseña no encontrada';
    END IF;

    IF v_host_owner != p_host_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo el propietario de la propiedad puede responder';
    END IF;

    IF EXISTS (SELECT 1 FROM reviews WHERE id = p_review_id AND host_reply IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Esta reseña ya tiene una respuesta';
    END IF;

    UPDATE reviews
    SET host_reply = p_reply
    WHERE id = p_review_id;

    SELECT
        p_review_id AS review_id,
        p_reply AS host_reply;
END //

DELIMITER ;

-- =========================================================
-- 030: sp_log_email
-- =========================================================

DROP PROCEDURE IF EXISTS sp_log_email;

DELIMITER //

CREATE PROCEDURE sp_log_email(
    IN p_user_id BIGINT UNSIGNED,
    IN p_booking_id BIGINT UNSIGNED,
    IN p_brevo_message_id VARCHAR(100),
    IN p_template_type VARCHAR(50)
)
BEGIN
    INSERT INTO email_logs (user_id, booking_id, brevo_message_id, template_type, status, created_at)
    VALUES (p_user_id, p_booking_id, p_brevo_message_id, p_template_type, 'sent', NOW());

    SELECT LAST_INSERT_ID() AS log_id;
END //

DELIMITER ;

-- =========================================================
-- 035: sp_log_admin_action
-- =========================================================

DROP PROCEDURE IF EXISTS sp_log_admin_action;

DELIMITER //

CREATE PROCEDURE sp_log_admin_action(
    IN p_admin_id BIGINT UNSIGNED,
    IN p_action VARCHAR(60),
    IN p_target_type VARCHAR(30),
    IN p_target_id BIGINT UNSIGNED,
    IN p_old_value JSON,
    IN p_new_value JSON,
    IN p_reason VARCHAR(500)
)
BEGIN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, old_value, new_value, reason, created_at)
    VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_old_value, p_new_value, p_reason, NOW());

    SELECT LAST_INSERT_ID() AS log_id;
END //

DELIMITER ;
