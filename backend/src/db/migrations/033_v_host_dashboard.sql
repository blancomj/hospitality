-- ============================================
-- Migración 033: Vista v_host_dashboard
-- CONSTRUESCALA Hospitality
-- CU-49: Vista general del propietario
-- ============================================

DROP VIEW IF EXISTS v_host_dashboard;

CREATE VIEW v_host_dashboard AS
SELECT
  p.host_id,
  -- Reservas del mes
  COUNT(DISTINCT CASE 
    WHEN b.status IN ('confirmed', 'completed') 
    AND MONTH(b.start_date) = MONTH(CURDATE()) 
    AND YEAR(b.start_date) = YEAR(CURDATE())
    THEN b.id 
  END) AS bookings_this_month,
  -- Ingresos del mes (neto)
  COALESCE(SUM(CASE 
    WHEN py.status = 'paid' 
    AND MONTH(py.paid_at) = MONTH(CURDATE()) 
    AND YEAR(py.paid_at) = YEAR(CURDATE())
    THEN py.net_amount 
    ELSE 0 
  END), 0) AS income_this_month,
  -- Ingresos acumulados
  COALESCE(SUM(CASE 
    WHEN py.status = 'paid' 
    THEN py.net_amount 
    ELSE 0 
  END), 0) AS income_total,
  -- Propiedades activas
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) AS active_properties,
  -- Próximas llegadas (7 días)
  COUNT(DISTINCT CASE 
    WHEN b.status = 'confirmed' 
    AND b.start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    THEN b.id 
  END) AS upcoming_checkins,
  -- Próximas salidas (7 días)
  COUNT(DISTINCT CASE 
    WHEN b.status = 'confirmed' 
    AND b.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    THEN b.id 
  END) AS upcoming_checkouts,
  -- Payouts pendientes
  COUNT(DISTINCT CASE WHEN py.status = 'pending' THEN py.id END) AS pending_payouts,
  COALESCE(SUM(CASE WHEN py.status = 'pending' THEN py.net_amount ELSE 0 END), 0) AS pending_payout_amount,
  -- Reservas sin reseña (post-checkout)
  COUNT(DISTINCT CASE 
    WHEN b.status = 'completed' 
    AND b.end_date < CURDATE()
    AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id)
    THEN b.id 
  END) AS unanswered_reviews
FROM properties p
LEFT JOIN bookings b ON p.id = b.property_id
LEFT JOIN payouts py ON b.id = py.booking_id
WHERE p.host_id IS NOT NULL
GROUP BY p.host_id;
