-- ============================================
-- Migración 030: SP para registrar envío de email
-- CONSTRUESCALA Hospitality
-- CU-24, CU-25: Notificaciones por email
-- ============================================

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
