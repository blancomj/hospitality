-- ============================================
-- Migración 022: SP para confirmar pago
-- CONSTRUESCALA Hospitality
-- Confirma pago desde webhook de Wompi
-- ============================================

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

    -- Verificar que existe un pago pendiente para esta reserva
    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1;

    IF v_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró pago pendiente para esta reserva';
    END IF;

    -- Actualizar pago
    UPDATE payments
    SET wompi_transaction_id = p_wompi_transaction_id,
        status = 'approved',
        payment_method = p_payment_method,
        raw_webhook_payload = p_raw_payload
    WHERE id = v_payment_id;

    -- Confirmar reserva
    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = p_booking_id;

    -- Obtener datos para payout
    SELECT b.property_id, p.host_id, b.total_amount
    INTO v_property_id, v_host_id, v_total_amount
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = p_booking_id;

    -- Obtener tasa de comisión
    SELECT COALESCE(hp.custom_commission_rate, 15.00) INTO v_commission_rate
    FROM host_profiles hp
    WHERE hp.user_id = v_host_id;

    -- Calcular comisión y monto neto
    SET v_commission_amount = ROUND(v_total_amount * v_commission_rate / 100, 2);
    SET v_net_amount = v_total_amount - v_commission_amount;

    -- Crear payout pendiente
    INSERT INTO payouts (booking_id, host_id, gross_amount, commission_amount, net_amount, status, created_at)
    VALUES (p_booking_id, v_host_id, v_total_amount, v_commission_amount, v_net_amount, 'pending', NOW());

    -- Retornar confirmación
    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS total_amount,
        v_commission_amount AS commission_amount,
        v_net_amount AS net_amount;
END //

DELIMITER ;
