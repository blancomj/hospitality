-- ============================================
-- Migración 027: Vista de reporte de comisiones
-- CONSTRUESCALA Hospitality
-- CU-20: Ver reporte de comisiones (admin)
-- ============================================

DROP VIEW IF EXISTS v_commission_report;

CREATE VIEW v_commission_report AS
SELECT
    p.id AS payout_id,
    b.id AS booking_id,
    pr.title AS property_title,
    pr.city AS property_city,
    u.full_name AS host_name,
    u.email AS host_email,
    p.gross_amount,
    p.commission_amount,
    p.net_amount,
    ROUND((p.commission_amount / p.gross_amount) * 100, 2) AS commission_rate,
    p.status AS payout_status,
    b.start_date AS check_in,
    b.end_date AS check_out,
    b.status AS booking_status,
    p.created_at AS payout_created_at,
    p.paid_at
FROM payouts p
JOIN bookings b ON p.booking_id = b.id
JOIN properties pr ON b.property_id = pr.id
JOIN users u ON p.host_id = u.id
ORDER BY p.created_at DESC;
