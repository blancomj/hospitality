-- ============================================
-- Migración 034: Vista v_admin_kpis
-- CONSTRUESCALA Hospitality
-- CU-53: Dashboard global de la plataforma
-- ============================================

DROP VIEW IF EXISTS v_admin_kpis;

CREATE VIEW v_admin_kpis AS
SELECT
  -- Reservas del período
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) AS confirmed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,
  -- GMV (Gross Merchandise Volume)
  COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END), 0) AS gmv,
  -- Comisiones generadas
  COALESCE(SUM(CASE WHEN py.status IN ('paid', 'processing') THEN py.commission_amount ELSE 0 END), 0) AS commissions_generated,
  -- Payouts pendientes vs pagados
  COUNT(DISTINCT CASE WHEN py.status = 'pending' THEN py.id END) AS pending_payouts,
  COALESCE(SUM(CASE WHEN py.status = 'pending' THEN py.net_amount ELSE 0 END), 0) AS pending_payout_amount,
  COUNT(DISTINCT CASE WHEN py.status = 'paid' THEN py.id END) AS paid_payouts,
  COALESCE(SUM(CASE WHEN py.status = 'paid' THEN py.net_amount ELSE 0 END), 0) AS paid_payout_amount,
  -- Usuarios nuevos
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN u.id END) AS new_users_30d,
  -- Propietarios
  COUNT(DISTINCT CASE WHEN u.role = 'host' THEN u.id END) AS total_hosts,
  COUNT(DISTINCT CASE WHEN hp.approval_status = 'pending_approval' THEN hp.user_id END) AS pending_host_approvals,
  -- Propiedades activas por ciudad
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) AS active_properties
FROM bookings b
LEFT JOIN payouts py ON b.id = py.booking_id
CROSS JOIN users u
LEFT JOIN host_profiles hp ON u.id = hp.user_id
LEFT JOIN properties p ON 1=1;
