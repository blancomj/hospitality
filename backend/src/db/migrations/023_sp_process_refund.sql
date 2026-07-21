-- ============================================
-- Migración 023: SP para procesar reembolso
-- CONSTRUESCALA Hospitality
-- Actualiza estados tras reembolso exitoso
-- ============================================

DROP PROCEDURE IF EXISTS sp_process_refund;

DELIMITER //

CREATE PROCEDURE sp_process_refund(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_refund_amount DECIMAL(10,2)
)
BEGIN
    DECLARE v_payment_id BIGINT UNSIGNED;
    DECLARE v_payout_id BIGINT UNSIGNED;

    -- Obtener pago asociado
    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'approved'
    LIMIT 1;

    IF v_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró pago aprobado para esta reserva';
    END IF;

    -- Actualizar estado del pago
    UPDATE payments
    SET status = 'refunded'
    WHERE id = v_payment_id;

    -- Actualizar estado de la reserva
    UPDATE bookings
    SET status = 'refunded'
    WHERE id = p_booking_id;

    -- Cancelar payout pendiente si existe
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

    -- Retornar confirmación
    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        p_refund_amount AS refund_amount;
END //

DELIMITER ;
