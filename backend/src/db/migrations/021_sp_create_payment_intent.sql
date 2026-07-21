-- ============================================
-- Migración 021: SP para crear payment intent
-- CONSTRUESCALA Hospitality
-- Genera datos para checkout de Wompi
-- ============================================

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

    -- Verificar que la reserva existe y está en pending_payment
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

    -- Obtener el monto total
    SELECT total_amount INTO v_total_amount
    FROM bookings
    WHERE id = p_booking_id;

    -- Generar referencia única
    SET v_reference = CONCAT('CS-', p_booking_id, '-', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'));

    -- Crear registro de pago
    INSERT INTO payments (booking_id, amount, status, created_at)
    VALUES (p_booking_id, v_total_amount, 'pending', NOW());

    SET v_payment_id = LAST_INSERT_ID();

    -- Retornar datos para el checkout de Wompi
    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS amount,
        v_reference AS reference,
        'COP' AS currency;
END //

DELIMITER ;
