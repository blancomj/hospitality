-- ============================================
-- Migración 051: Consolidación del flujo de reservas y pagos
-- CONSTRUESCALA Hospitality
--
-- Corrige seis problemas detectados al auditar CU-11 a CU-16:
--
-- 1) bookings.status no admitía 'expired' ni 'refunded', pese a que
--    sp_expire_pending_payments y sp_process_refund escriben esos valores.
--    La definición divergía entre la migración 014 y temporary_all_tables.sql.
-- 2) sp_create_payment_intent generaba una `reference` y no la guardaba, y
--    creaba una fila de pago nueva en cada reintento.
-- 3) sp_cancel_booking marcaba el pago como 'refunded' sin que ningún
--    reembolso ocurriera. El dinero nunca salía de la cuenta.
-- 4) Existían dos procedimientos de expiración compitiendo, uno de ellos
--    (sp_expire_pending_bookings) sin invocar desde ninguna parte.
-- 5) v_bookings_detail no exponía el estado del reembolso.
-- 6) max_booking_nights estaba en 30, anulando la corrección de la 048 que
--    precisamente arregló el cálculo de estancias largas.
--
-- Decisión de negocio aplicada: el reembolso NO es automático. Al cancelar se
-- encola una solicitud que un administrador aprueba o rechaza (cola de
-- revisión), y sólo entonces se llama a Wompi.
-- ============================================

-- --------------------------------------------
-- 0. Helper de DDL idempotente
--
-- MySQL 8 no soporta ADD COLUMN IF NOT EXISTS. Sin esto, migraciones como la
-- 038 y la 045 (que añaden columnas ya declaradas en 014 y 016) abortan el
-- proceso al correr sobre una base construida desde otro origen.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp__add_column_if_missing;

DELIMITER //

CREATE PROCEDURE sp__add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

-- --------------------------------------------
-- 1. Estados de reserva y de pago
-- --------------------------------------------
ALTER TABLE bookings
  MODIFY COLUMN status
    ENUM('pending_payment','confirmed','cancelled','completed','expired','refunded')
    NOT NULL DEFAULT 'pending_payment';

ALTER TABLE payments
  MODIFY COLUMN status
    ENUM('pending','approved','declined','refunded','partially_refunded')
    NOT NULL DEFAULT 'pending';

-- --------------------------------------------
-- 2. Referencia y monto reembolsado en payments
-- --------------------------------------------
CALL sp__add_column_if_missing('payments', 'reference', 'VARCHAR(60) NULL AFTER booking_id');
CALL sp__add_column_if_missing('payments', 'refunded_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER amount');
CALL sp__add_column_if_missing('payments', 'updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- La referencia debe ser única: es lo que Wompi devuelve en el webhook.
DROP PROCEDURE IF EXISTS sp__add_unique_index_if_missing;

DELIMITER //

CREATE PROCEDURE sp__add_unique_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_columns VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE INDEX `', p_index_name, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;

CALL sp__add_unique_index_if_missing('payments', 'uq_payments_reference', 'reference');

-- --------------------------------------------
-- 3. Cola de solicitudes de reembolso
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS refund_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  requested_amount DECIMAL(10,2) NOT NULL,
  refund_percentage DECIMAL(5,2) NOT NULL,
  policy_applied VARCHAR(20) NOT NULL,
  days_until_checkin INT NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('pending','processing','approved','rejected','failed')
    NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_notes VARCHAR(500) NULL,
  wompi_refund_id VARCHAR(100) NULL,
  failure_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking (booking_id),
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB;

-- --------------------------------------------
-- 4. Ajustes de configuración
-- --------------------------------------------
INSERT INTO platform_settings (key_name, value_number) VALUES
  ('max_booking_nights', 365)
ON DUPLICATE KEY UPDATE
  value_number = IF(COALESCE(value_number, 0) <= 30, 365, value_number);

INSERT IGNORE INTO platform_settings (key_name, value_number) VALUES
  ('refund_requires_approval', 1);

-- --------------------------------------------
-- 5. sp_create_payment_intent (corregido)
--
-- Guarda la referencia y reutiliza el intento pendiente en vez de crear una
-- fila nueva por cada reintento del huésped.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_create_payment_intent;

DELIMITER //

CREATE PROCEDURE sp_create_payment_intent(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_reference VARCHAR(60);
  DECLARE v_expires_at TIMESTAMP;
  DECLARE v_valid TINYINT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT 1, total_amount, expires_at
    INTO v_valid, v_total_amount, v_expires_at
  FROM bookings
  WHERE id = p_booking_id
    AND guest_id = p_user_id
    AND status = 'pending_payment'
    AND expires_at > NOW()
  FOR UPDATE;

  IF v_valid = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Reserva no encontrada, no está pendiente de pago, o ha expirado';
  END IF;

  -- Reutilizar el intento pendiente si existe: la referencia debe ser estable
  -- mientras la reserva siga viva, para que el webhook pueda reconciliar.
  SELECT id, reference INTO v_payment_id, v_reference
  FROM payments
  WHERE booking_id = p_booking_id
    AND status = 'pending'
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    SET v_reference = CONCAT('CS-', p_booking_id, '-', UNIX_TIMESTAMP(), '-',
                             LPAD(FLOOR(RAND() * 10000), 4, '0'));

    INSERT INTO payments (booking_id, reference, amount, status, created_at)
    VALUES (p_booking_id, v_reference, v_total_amount, 'pending', NOW());

    SET v_payment_id = LAST_INSERT_ID();
  ELSEIF v_reference IS NULL THEN
    -- Fila creada por la versión anterior del SP, que no guardaba referencia.
    SET v_reference = CONCAT('CS-', p_booking_id, '-', UNIX_TIMESTAMP(), '-',
                             LPAD(FLOOR(RAND() * 10000), 4, '0'));
    UPDATE payments SET reference = v_reference, amount = v_total_amount
    WHERE id = v_payment_id;
  ELSE
    -- El monto pudo cambiar si el propietario ajustó precios especiales.
    UPDATE payments SET amount = v_total_amount WHERE id = v_payment_id;
  END IF;

  COMMIT;

  SELECT
    v_payment_id AS payment_id,
    p_booking_id AS booking_id,
    v_total_amount AS amount,
    v_reference AS reference,
    'COP' AS currency,
    v_expires_at AS expires_at;
END //

DELIMITER ;

-- --------------------------------------------
-- 6. sp_cancel_booking (corregido)
--
-- Ya no marca el pago como reembolsado. Encola una solicitud para revisión
-- administrativa y deja el pago intacto hasta que Wompi confirme.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_cancel_booking;

DELIMITER //

CREATE PROCEDURE sp_cancel_booking(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED,
  IN p_reason VARCHAR(500)
)
BEGIN
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_guest_id BIGINT UNSIGNED;
  DECLARE v_host_id BIGINT UNSIGNED;
  DECLARE v_start_date DATE;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_cancellation_policy VARCHAR(20);
  DECLARE v_days_until_checkin INT;
  DECLARE v_refund_percentage DECIMAL(5,2);
  DECLARE v_refund_amount DECIMAL(10,2);
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_refund_request_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_refund_status VARCHAR(20) DEFAULT 'none';

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT
    b.status, b.guest_id, b.start_date, b.total_amount,
    p.cancellation_policy, p.host_id
  INTO
    v_booking_status, v_guest_id, v_start_date, v_total_amount,
    v_cancellation_policy, v_host_id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  IF v_guest_id <> p_user_id AND v_host_id <> p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to cancel this booking';
    END IF;
  END IF;

  IF v_booking_status NOT IN ('pending_payment', 'confirmed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking cannot be cancelled in its current status';
  END IF;

  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());

  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 1, 100.00, 0.00);
    WHEN 'moderada' THEN
      SET v_refund_percentage =
        CASE
          WHEN v_days_until_checkin >= 5 THEN 100.00
          WHEN v_days_until_checkin >= 3 THEN 50.00
          ELSE 0.00
        END;
    WHEN 'estricta' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 7, 50.00, 0.00);
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SET v_refund_amount = ROUND(v_total_amount * v_refund_percentage / 100, 2);

  UPDATE bookings
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = p_user_id,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;

  -- Sólo hay algo que reembolsar si el huésped llegó a pagar.
  SELECT id INTO v_payment_id
  FROM payments
  WHERE booking_id = p_booking_id
    AND status = 'approved'
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NOT NULL AND v_refund_amount > 0 THEN
    INSERT INTO refund_requests (
      booking_id, payment_id, requested_by, requested_amount,
      refund_percentage, policy_applied, days_until_checkin, reason, status
    ) VALUES (
      p_booking_id, v_payment_id, p_user_id, v_refund_amount,
      v_refund_percentage, v_cancellation_policy, v_days_until_checkin,
      p_reason, 'pending'
    );

    SET v_refund_request_id = LAST_INSERT_ID();
    SET v_refund_status = 'pending';
  ELSEIF v_payment_id IS NOT NULL THEN
    SET v_refund_status = 'not_eligible';
  END IF;

  -- El payout al propietario se retiene siempre que la reserva se cancele.
  UPDATE payouts
  SET status = 'failed'
  WHERE booking_id = p_booking_id AND status IN ('pending', 'processing');

  COMMIT;

  SELECT
    p_booking_id AS booking_id,
    'cancelled' AS status,
    p_reason AS cancellation_reason,
    v_refund_amount AS refund_amount,
    v_refund_percentage AS refund_percentage,
    v_cancellation_policy AS policy_applied,
    v_days_until_checkin AS days_until_checkin,
    v_refund_request_id AS refund_request_id,
    v_refund_status AS refund_status;
END //

DELIMITER ;

-- --------------------------------------------
-- 7. sp_quote_cancellation
--
-- Permite mostrar al usuario cuánto se le reembolsará ANTES de confirmar la
-- cancelación, sin efectos secundarios (brecha 2 del panel del propietario).
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_quote_cancellation;

DELIMITER //

CREATE PROCEDURE sp_quote_cancellation(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_guest_id BIGINT UNSIGNED;
  DECLARE v_host_id BIGINT UNSIGNED;
  DECLARE v_start_date DATE;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_cancellation_policy VARCHAR(20);
  DECLARE v_days_until_checkin INT;
  DECLARE v_refund_percentage DECIMAL(5,2);
  DECLARE v_has_payment TINYINT DEFAULT 0;

  SELECT
    b.status, b.guest_id, b.start_date, b.total_amount,
    p.cancellation_policy, p.host_id
  INTO
    v_booking_status, v_guest_id, v_start_date, v_total_amount,
    v_cancellation_policy, v_host_id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id;

  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  IF v_guest_id <> p_user_id AND v_host_id <> p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to view this booking';
    END IF;
  END IF;

  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());

  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 1, 100.00, 0.00);
    WHEN 'moderada' THEN
      SET v_refund_percentage =
        CASE
          WHEN v_days_until_checkin >= 5 THEN 100.00
          WHEN v_days_until_checkin >= 3 THEN 50.00
          ELSE 0.00
        END;
    WHEN 'estricta' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 7, 50.00, 0.00);
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SELECT COUNT(*) INTO v_has_payment
  FROM payments
  WHERE booking_id = p_booking_id AND status = 'approved';

  SELECT
    p_booking_id AS booking_id,
    v_booking_status AS current_status,
    (v_booking_status IN ('pending_payment','confirmed')) AS can_be_cancelled,
    v_total_amount AS total_amount,
    v_cancellation_policy AS policy_applied,
    v_days_until_checkin AS days_until_checkin,
    v_refund_percentage AS refund_percentage,
    ROUND(v_total_amount * v_refund_percentage / 100, 2) AS refund_amount,
    (v_has_payment > 0) AS has_payment,
    IF(v_has_payment = 0, 'no_payment',
      IF(v_refund_percentage = 0, 'not_eligible', 'requires_approval')) AS refund_outcome;
END //

DELIMITER ;

-- --------------------------------------------
-- 8. Aprobación y rechazo de reembolsos (dos fases)
--
-- Fase 1 (sp_start_refund): marca 'processing' y entrega a Express los datos
--   para llamar a Wompi. Evita dobles envíos si el admin hace doble clic.
-- Fase 2 (sp_settle_refund): registra el resultado real de Wompi.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_start_refund;

DELIMITER //

CREATE PROCEDURE sp_start_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_transaction_id VARCHAR(100);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, booking_id, payment_id, requested_amount
    INTO v_status, v_booking_id, v_payment_id, v_amount
  FROM refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud de reembolso no encontrada';
  END IF;

  IF v_status <> 'pending' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La solicitud ya fue procesada';
  END IF;

  SELECT wompi_transaction_id INTO v_transaction_id
  FROM payments
  WHERE id = v_payment_id;

  IF v_transaction_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El pago no tiene transacción de Wompi asociada';
  END IF;

  UPDATE refund_requests
  SET status = 'processing',
      reviewed_by = p_admin_id,
      reviewed_at = NOW()
  WHERE id = p_refund_request_id;

  COMMIT;

  SELECT
    p_refund_request_id AS refund_request_id,
    v_booking_id AS booking_id,
    v_payment_id AS payment_id,
    v_amount AS refund_amount,
    v_transaction_id AS wompi_transaction_id;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_settle_refund;

DELIMITER //

CREATE PROCEDURE sp_settle_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_success TINYINT,
  IN p_wompi_refund_id VARCHAR(100),
  IN p_failure_reason VARCHAR(500)
)
BEGIN
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_payment_amount DECIMAL(10,2);
  DECLARE v_already_refunded DECIMAL(10,2);
  DECLARE v_new_refunded DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT booking_id, payment_id, requested_amount
    INTO v_booking_id, v_payment_id, v_amount
  FROM refund_requests
  WHERE id = p_refund_request_id AND status = 'processing'
  FOR UPDATE;

  IF v_booking_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud no encontrada o no está en proceso';
  END IF;

  IF p_success = 0 THEN
    UPDATE refund_requests
    SET status = 'failed',
        failure_reason = p_failure_reason
    WHERE id = p_refund_request_id;

    COMMIT;

    SELECT p_refund_request_id AS refund_request_id, 'failed' AS status;
  ELSE
    SELECT amount, refunded_amount INTO v_payment_amount, v_already_refunded
    FROM payments
    WHERE id = v_payment_id
    FOR UPDATE;

    SET v_new_refunded = v_already_refunded + v_amount;

    UPDATE payments
    SET refunded_amount = v_new_refunded,
        status = IF(v_new_refunded >= v_payment_amount, 'refunded', 'partially_refunded')
    WHERE id = v_payment_id;

    UPDATE bookings
    SET status = 'refunded', updated_at = NOW()
    WHERE id = v_booking_id;

    UPDATE payouts
    SET status = 'failed'
    WHERE booking_id = v_booking_id AND status IN ('pending', 'processing');

    UPDATE refund_requests
    SET status = 'approved',
        wompi_refund_id = p_wompi_refund_id
    WHERE id = p_refund_request_id;

    COMMIT;

    SELECT
      p_refund_request_id AS refund_request_id,
      'approved' AS status,
      v_booking_id AS booking_id,
      v_amount AS refund_amount;
  END IF;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_reject_refund;

DELIMITER //

CREATE PROCEDURE sp_reject_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_notes VARCHAR(500)
)
BEGIN
  DECLARE v_status VARCHAR(20);

  SELECT status INTO v_status
  FROM refund_requests
  WHERE id = p_refund_request_id;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud de reembolso no encontrada';
  END IF;

  IF v_status NOT IN ('pending', 'failed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Sólo se pueden rechazar solicitudes pendientes o fallidas';
  END IF;

  UPDATE refund_requests
  SET status = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      review_notes = p_notes
  WHERE id = p_refund_request_id;

  SELECT p_refund_request_id AS refund_request_id, 'rejected' AS status;
END //

DELIMITER ;

-- --------------------------------------------
-- 8b. Reembolso manual iniciado por un administrador
--
-- El admin puede cancelar por fuera de la política (disputas, fuerza mayor),
-- pero el dinero sigue saliendo por el mismo camino auditable.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_request_manual_refund;

DELIMITER //

CREATE PROCEDURE sp_request_manual_refund(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_amount DECIMAL(10,2),
  IN p_reason VARCHAR(500)
)
BEGIN
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_payment_amount DECIMAL(10,2);
  DECLARE v_already_refunded DECIMAL(10,2);
  DECLARE v_start_date DATE;

  SELECT p.id, p.amount, p.refunded_amount, b.start_date
    INTO v_payment_id, v_payment_amount, v_already_refunded, v_start_date
  FROM payments p
  JOIN bookings b ON p.booking_id = b.id
  WHERE p.booking_id = p_booking_id
    AND p.status IN ('approved', 'partially_refunded')
  ORDER BY p.id DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No hay pago reembolsable para esta reserva';
  END IF;

  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El monto a reembolsar debe ser mayor que cero';
  END IF;

  IF (v_already_refunded + p_amount) > v_payment_amount THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El reembolso excede el monto pagado';
  END IF;

  INSERT INTO refund_requests (
    booking_id, payment_id, requested_by, requested_amount,
    refund_percentage, policy_applied, days_until_checkin, reason, status
  ) VALUES (
    p_booking_id, v_payment_id, p_admin_id, p_amount,
    ROUND(p_amount / v_payment_amount * 100, 2), 'manual',
    DATEDIFF(v_start_date, CURDATE()), p_reason, 'pending'
  );

  SELECT LAST_INSERT_ID() AS refund_request_id;
END //

DELIMITER ;

-- sp_process_refund permitía marcar un pago como reembolsado sin que ningún
-- reembolso ocurriera. Se elimina para que exista un único camino al dinero:
-- sp_start_refund -> API de Wompi -> sp_settle_refund.
DROP PROCEDURE IF EXISTS sp_process_refund;

-- --------------------------------------------
-- 9. Expiración unificada
--
-- Se elimina sp_expire_pending_bookings (nunca invocado, y ponía 'cancelled'
-- en vez de 'expired'). Queda un único procedimiento como fuente de verdad.
-- --------------------------------------------
DROP PROCEDURE IF EXISTS sp_expire_pending_bookings;
DROP PROCEDURE IF EXISTS sp_expire_pending_payments;

DELIMITER //

CREATE PROCEDURE sp_expire_pending_payments()
BEGIN
  DECLARE v_expired_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Nunca expirar una reserva que ya tiene un pago aprobado: significaría que
  -- el webhook llegó tarde y estaríamos liberando fechas ya vendidas.
  UPDATE bookings b
  SET b.status = 'expired', b.updated_at = NOW()
  WHERE b.status = 'pending_payment'
    AND b.expires_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.booking_id = b.id AND p.status = 'approved'
    );

  SET v_expired_count = ROW_COUNT();

  UPDATE payments p
  JOIN bookings b ON p.booking_id = b.id
  SET p.status = 'declined'
  WHERE b.status = 'expired' AND p.status = 'pending';

  COMMIT;

  SELECT v_expired_count AS expired_bookings;
END //

DELIMITER ;

-- --------------------------------------------
-- 10. v_bookings_detail reconstruida
-- --------------------------------------------
DROP VIEW IF EXISTS v_bookings_detail;

CREATE VIEW v_bookings_detail AS
SELECT
  b.id AS booking_id,
  b.property_id,
  b.guest_id,
  b.start_date,
  b.end_date,
  b.guests_count,
  b.price_per_night,
  b.total_amount,
  b.status,
  b.expires_at,
  b.cancellation_reason,
  b.cancelled_by,
  b.cancelled_at,
  b.created_at AS booking_created_at,
  b.updated_at AS booking_updated_at,

  p.title AS property_title,
  p.city AS property_city,
  p.neighborhood AS property_neighborhood,
  p.property_type AS property_type,
  p.max_guests AS property_max_guests,
  p.bedrooms AS property_bedrooms,
  p.host_id AS property_host_id,
  p.cancellation_policy AS property_cancellation_policy,

  u.full_name AS guest_name,
  u.email AS guest_email,
  u.phone AS guest_phone,
  u.avatar_url AS guest_avatar,

  hu.full_name AS host_name,
  hu.email AS host_email,
  hu.phone AS host_phone,

  pay.status AS payment_status,
  pay.reference AS payment_reference,
  pay.refunded_amount AS refunded_amount,

  rr.id AS refund_request_id,
  rr.status AS refund_request_status,
  rr.requested_amount AS refund_requested_amount,

  DATEDIFF(b.end_date, b.start_date) AS total_nights,

  (b.status = 'confirmed' AND b.end_date <= CURDATE()) AS is_completed,
  (b.status IN ('pending_payment', 'confirmed') AND b.start_date > CURDATE()) AS can_be_cancelled,
  (b.status = 'pending_payment' AND b.expires_at > NOW()) AS can_be_paid

FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.guest_id = u.id
JOIN users hu ON p.host_id = hu.id
-- Último pago y última solicitud de reembolso de cada reserva.
-- Se resuelve con tablas derivadas en vez de subconsultas correlacionadas en
-- el ON: es equivalente y no depende del optimizador para no degradarse.
LEFT JOIN (
  SELECT p1.id, p1.booking_id, p1.status, p1.reference, p1.refunded_amount
  FROM payments p1
  JOIN (
    SELECT booking_id, MAX(id) AS id FROM payments GROUP BY booking_id
  ) last_pay ON last_pay.id = p1.id
) pay ON pay.booking_id = b.id
LEFT JOIN (
  SELECT r1.id, r1.booking_id, r1.status, r1.requested_amount
  FROM refund_requests r1
  JOIN (
    SELECT booking_id, MAX(id) AS id FROM refund_requests GROUP BY booking_id
  ) last_rr ON last_rr.id = r1.id
) rr ON rr.booking_id = b.id;

-- --------------------------------------------
-- 11. Vista de cola de reembolsos para administración
-- --------------------------------------------
DROP VIEW IF EXISTS v_refund_queue;

CREATE VIEW v_refund_queue AS
SELECT
  rr.id AS refund_request_id,
  rr.booking_id,
  rr.status,
  rr.requested_amount,
  rr.refund_percentage,
  rr.policy_applied,
  rr.days_until_checkin,
  rr.reason,
  rr.review_notes,
  rr.failure_reason,
  rr.wompi_refund_id,
  rr.created_at,
  rr.reviewed_at,

  b.start_date,
  b.end_date,
  b.total_amount AS booking_total,

  p.title AS property_title,
  p.city AS property_city,

  guest.full_name AS guest_name,
  guest.email AS guest_email,

  requester.full_name AS requested_by_name,
  reviewer.full_name AS reviewed_by_name,

  pay.wompi_transaction_id

FROM refund_requests rr
JOIN bookings b ON rr.booking_id = b.id
JOIN properties p ON b.property_id = p.id
JOIN users guest ON b.guest_id = guest.id
JOIN users requester ON rr.requested_by = requester.id
LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
JOIN payments pay ON rr.payment_id = pay.id;
