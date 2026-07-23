-- ============================================
-- Migración 047: Fix sp_get_host_finances
-- Quitar wompi_payout_reference y paid_at
-- que pueden no existir en payouts
-- ============================================

DROP PROCEDURE IF EXISTS sp_get_host_finances;

CREATE PROCEDURE sp_get_host_finances(
  IN p_host_id BIGINT UNSIGNED,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    py.id AS payout_id,
    py.booking_id,
    p.title AS property_title,
    p.city AS property_city,
    b.start_date AS check_in,
    b.end_date AS check_out,
    py.gross_amount,
    py.commission_amount,
    py.net_amount,
    py.status,
    py.created_at
  FROM payouts py
  JOIN bookings b ON py.booking_id = b.id
  JOIN properties p ON b.property_id = p.id
  WHERE py.host_id = p_host_id
    AND (p_from_date IS NULL OR py.created_at >= p_from_date)
    AND (p_to_date IS NULL OR py.created_at <= CONCAT(p_to_date, ' 23:59:59'))
  ORDER BY py.created_at DESC;
END;
