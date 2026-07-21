-- ============================================
-- Migración 019: sp_expire_pending_bookings
-- Limpia pre-reservas vencidas
-- CONSTRUESCALA Hospitality
-- ============================================

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

  -- Count expired bookings
  SELECT COUNT(*) INTO v_expired_count
  FROM bookings
  WHERE status = 'pending_payment'
    AND expires_at < NOW();

  -- Update expired bookings to cancelled
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'Payment timeout - booking expired',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending_payment'
    AND expires_at < NOW();

  COMMIT;

  -- Return count of expired bookings
  SELECT v_expired_count AS expired_count;

END //

DELIMITER ;
