-- ============================================
-- Migración 036: SP para registrar acción de admin
-- CONSTRUESCALA Hospitality
-- CU-58: Auditoría de acciones administrativas
-- ============================================

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
