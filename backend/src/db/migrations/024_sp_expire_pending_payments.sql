-- ============================================
-- Migración 024: SP para expirar pagos pendientes
-- CONSTRUESCALA Hospitality
-- Limpia reservas con pago pendiente expirado
-- ============================================

DROP PROCEDURE IF EXISTS sp_expire_pending_payments;

DELIMITER //

CREATE PROCEDURE sp_expire_pending_payments()
BEGIN
    DECLARE v_expired_count INT DEFAULT 0;

    -- Marcar como expiradas las reservas con pago pendiente que pasaron su tiempo límite
    UPDATE bookings
    SET status = 'expired'
    WHERE status = 'pending_payment'
      AND expires_at < NOW();

    SET v_expired_count = ROW_COUNT();

    -- Eliminar pagos pendientes de reservas expiradas
    DELETE p FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    WHERE b.status = 'expired'
      AND p.status = 'pending';

    -- Retornar cantidad de reservas expiradas
    SELECT v_expired_count AS expired_bookings;
END //

DELIMITER ;
