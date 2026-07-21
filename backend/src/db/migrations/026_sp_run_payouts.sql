-- ============================================
-- Migración 026: SP para ejecutar payouts pendientes
-- CONSTRUESCALA Hospitality
-- CU-19: Ejecutar payout a propietarios
-- ============================================

DROP PROCEDURE IF EXISTS sp_run_payouts;

DELIMITER //

CREATE PROCEDURE sp_run_payouts()
BEGIN
    DECLARE v_payout_count INT DEFAULT 0;

    -- Seleccionar payouts pendientes cuya reserva ya pasó el check-in
    -- y marcarlos como processing
    UPDATE payouts p
    JOIN bookings b ON p.booking_id = b.id
    SET p.status = 'processing'
    WHERE p.status = 'pending'
      AND b.status = 'confirmed'
      AND b.start_date <= CURDATE();

    SET v_payout_count = ROW_COUNT();

    -- Retornar payouts en procesamiento
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
