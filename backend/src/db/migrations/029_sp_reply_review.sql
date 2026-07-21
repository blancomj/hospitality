-- ============================================
-- Migración 029: SP para responder reseña
-- CONSTRUESCALA Hospitality
-- CU-22: Responder reseña
-- ============================================

DROP PROCEDURE IF EXISTS sp_reply_review;

DELIMITER //

CREATE PROCEDURE sp_reply_review(
    IN p_review_id BIGINT UNSIGNED,
    IN p_host_id BIGINT UNSIGNED,
    IN p_reply TEXT
)
BEGIN
    DECLARE v_host_owner BIGINT UNSIGNED;

    -- Verificar que la reseña existe y el propietario es dueño de la propiedad
    SELECT pr.host_id INTO v_host_owner
    FROM reviews r
    JOIN properties pr ON r.property_id = pr.id
    WHERE r.id = p_review_id;

    IF v_host_owner IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reseña no encontrada';
    END IF;

    IF v_host_owner != p_host_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo el propietario de la propiedad puede responder';
    END IF;

    -- Verificar que no tenga ya una respuesta
    IF EXISTS (SELECT 1 FROM reviews WHERE id = p_review_id AND host_reply IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Esta reseña ya tiene una respuesta';
    END IF;

    -- Actualizar respuesta
    UPDATE reviews
    SET host_reply = p_reply
    WHERE id = p_review_id;

    -- Retornar confirmación
    SELECT
        p_review_id AS review_id,
        p_reply AS host_reply;
END //

DELIMITER ;
