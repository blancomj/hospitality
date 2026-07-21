-- ============================================
-- Migración 025: SP para aprobar/rechazar propietario
-- CONSTRUESCALA Hospitality
-- CU-17: Aprobar propietario nuevo
-- ============================================

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

    -- Verificar que el propietario existe y tiene perfil
    SELECT approval_status INTO v_current_status
    FROM host_profiles
    WHERE user_id = p_user_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró perfil de propietario';
    END IF;

    -- Solo permitir aprobar/rechazar si está pendiente
    IF v_current_status != 'pending_approval' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El propietario ya fue procesado anteriormente';
    END IF;

    -- Determinar nuevo estado
    IF p_action = 'approve' THEN
        SET v_new_status = 'approved';
    ELSE
        SET v_new_status = 'rejected';
    END IF;

    -- Actualizar estado
    UPDATE host_profiles
    SET approval_status = v_new_status,
        approved_by = p_admin_id,
        approved_at = NOW()
    WHERE user_id = p_user_id;

    -- Retornar confirmación
    SELECT
        p_user_id AS user_id,
        v_new_status AS new_status,
        p_admin_id AS approved_by;
END //

DELIMITER ;
