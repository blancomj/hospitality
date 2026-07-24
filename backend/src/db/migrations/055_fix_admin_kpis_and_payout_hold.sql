-- ============================================================================
-- Migración 055: Corrección de KPIs de admin y estado "held" en payouts
-- CONSTRUESCALA Hospitality
-- ----------------------------------------------------------------------------
-- Cierra dos defectos verificados por ejecución contra copia real de producción:
--
--   1) v_admin_kpis inflaba las cifras de dinero (gmv, commissions_generated,
--      pending_payout_amount, paid_payout_amount) por un factor de
--      (nº usuarios × nº propiedades), a causa de un CROSS JOIN users y un
--      LEFT JOIN properties ON 1=1. Los COUNT(DISTINCT ...) no se veían
--      afectados; los SUM(...) sí. Se reescribe con subconsultas escalares
--      independientes: mismas 15 columnas, mismos nombres y tipos, resultado
--      correcto. (bug de la migración 034)
--
--   2) payouts.status no incluía 'held', pero la ruta
--      PATCH /admin/payouts/:id/hold hace SET status='held'. En modo STRICT
--      (default de Hostinger) esto falla con error 1265 "Data truncated";
--      en modo laxo deja status='' y el payout desaparece de todos los
--      filtros. Se añade 'held' al enum. sp_run_payouts sólo procesa
--      status='pending', así que los payouts en 'held' se saltan solos; la
--      acción de "liberar" ya devuelve el payout a 'pending'.
--
-- Idempotente: DROP VIEW IF EXISTS para la vista; guarda condicional en
-- information_schema para el ALTER del enum (sólo modifica si falta 'held').
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Vista v_admin_kpis sin producto cartesiano
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_admin_kpis;

CREATE VIEW v_admin_kpis AS
SELECT
  -- Reservas
  (SELECT COUNT(*) FROM bookings) AS total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') AS confirmed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'completed') AS completed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled') AS cancelled_bookings,
  -- GMV (Gross Merchandise Volume)
  (SELECT COALESCE(SUM(total_amount), 0)
     FROM bookings
    WHERE status IN ('confirmed', 'completed')) AS gmv,
  -- Comisiones generadas
  (SELECT COALESCE(SUM(commission_amount), 0)
     FROM payouts
    WHERE status IN ('paid', 'processing')) AS commissions_generated,
  -- Payouts pendientes vs pagados
  (SELECT COUNT(*) FROM payouts WHERE status = 'pending') AS pending_payouts,
  (SELECT COALESCE(SUM(net_amount), 0)
     FROM payouts WHERE status = 'pending') AS pending_payout_amount,
  (SELECT COUNT(*) FROM payouts WHERE status = 'paid') AS paid_payouts,
  (SELECT COALESCE(SUM(net_amount), 0)
     FROM payouts WHERE status = 'paid') AS paid_payout_amount,
  -- Usuarios
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(*) FROM users
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS new_users_30d,
  -- Propietarios
  (SELECT COUNT(*) FROM users WHERE role = 'host') AS total_hosts,
  (SELECT COUNT(*) FROM host_profiles
    WHERE approval_status = 'pending_approval') AS pending_host_approvals,
  -- Propiedades activas
  (SELECT COUNT(*) FROM properties WHERE status = 'published') AS active_properties;

-- ----------------------------------------------------------------------------
-- 2) Añadir 'held' al enum payouts.status (sólo si falta)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp__migration_055_payout_hold;

DELIMITER $$
CREATE PROCEDURE sp__migration_055_payout_hold()
BEGIN
  DECLARE v_has_held INT DEFAULT 0;

  SELECT COUNT(*)
    INTO v_has_held
    FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND table_name   = 'payouts'
     AND column_name  = 'status'
     AND COLUMN_TYPE LIKE '%''held''%';

  IF v_has_held = 0 THEN
    ALTER TABLE payouts
      MODIFY COLUMN status
      ENUM('pending','processing','paid','completed','failed','held')
      NOT NULL DEFAULT 'pending';
  END IF;
END$$
DELIMITER ;

CALL sp__migration_055_payout_hold();
DROP PROCEDURE IF EXISTS sp__migration_055_payout_hold;
