-- ============================================
-- Migración 018: sp_cancel_booking
-- Cancelación con política de cancelación
-- CONSTRUESCALA Hospitality
-- ============================================

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

  -- 1. Get booking details
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

  -- 2. Validate booking exists
  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  -- 3. Validate user is guest or host or admin
  IF v_guest_id != p_user_id AND v_host_id != p_user_id THEN
    -- Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to cancel this booking';
    END IF;
  END IF;

  -- 4. Validate booking can be cancelled
  IF v_booking_status NOT IN ('pending_payment', 'confirmed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking cannot be cancelled in its current status';
  END IF;

  -- 5. Calculate refund based on cancellation policy
  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());
  
  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      -- Full refund if cancelled 24+ hours before check-in
      IF v_days_until_checkin >= 1 THEN
        SET v_refund_percentage = 100.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    WHEN 'moderada' THEN
      -- Full refund if cancelled 5+ days before check-in
      IF v_days_until_checkin >= 5 THEN
        SET v_refund_percentage = 100.00;
      ELSEIF v_days_until_checkin >= 3 THEN
        SET v_refund_percentage = 50.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    WHEN 'estricta' THEN
      -- No refund if cancelled less than 7 days before check-in
      IF v_days_until_checkin >= 7 THEN
        SET v_refund_percentage = 50.00;
      ELSE
        SET v_refund_percentage = 0.00;
      END IF;
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SET v_refund_amount = ROUND(v_total_amount * v_refund_percentage / 100, 2);

  -- 6. Update booking status
  UPDATE bookings 
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = p_user_id,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 7. If there's a payment, mark for refund
  IF v_refund_amount > 0 THEN
    UPDATE payments 
    SET status = 'refunded'
    WHERE booking_id = p_booking_id AND status = 'approved';
  END IF;

  -- 8. Update payout if exists
  UPDATE payouts 
  SET status = 'failed'
  WHERE booking_id = p_booking_id AND status IN ('pending', 'processing');

  COMMIT;

  -- 9. Return cancellation details
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
