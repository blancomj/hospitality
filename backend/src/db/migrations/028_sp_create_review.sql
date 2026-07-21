-- ============================================
-- Migración 028: SP para crear reseña
-- CONSTRUESCALA Hospitality
-- CU-21: Dejar reseña tras estancia completada
-- ============================================

DROP PROCEDURE IF EXISTS sp_create_review;

DELIMITER //

CREATE PROCEDURE sp_create_review(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_guest_id BIGINT UNSIGNED,
    IN p_rating TINYINT UNSIGNED,
    IN p_comment TEXT
)
BEGIN
    DECLARE v_property_id BIGINT UNSIGNED;
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_guest_checkin DATE;
    DECLARE v_existing_review BIGINT UNSIGNED;

    -- Verificar que la reserva existe, pertenece al huésped y está completada
    SELECT property_id, status, end_date INTO v_property_id, v_booking_status, v_guest_checkin
    FROM bookings
    WHERE id = p_booking_id
      AND guest_id = p_guest_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reserva no encontrada o no pertenece al huésped';
    END IF;

    IF v_booking_status != 'completed' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo se pueden reseñar reservas completadas';
    END IF;

    -- Verificar que ya no existe una reseña para esta reserva
    SELECT id INTO v_existing_review
    FROM reviews
    WHERE booking_id = p_booking_id;

    IF v_existing_review IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ya existe una reseña para esta reserva';
    END IF;

    -- Validar rating (1-5)
    IF p_rating < 1 OR p_rating > 5 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El rating debe ser entre 1 y 5';
    END IF;

    -- Crear reseña
    INSERT INTO reviews (booking_id, property_id, guest_id, rating, comment, created_at)
    VALUES (p_booking_id, v_property_id, p_guest_id, p_rating, p_comment, NOW());

    -- Retornar la reseña creada
    SELECT
        LAST_INSERT_ID() AS review_id,
        p_booking_id AS booking_id,
        v_property_id AS property_id,
        p_rating AS rating,
        p_comment AS comment;
END //

DELIMITER ;
