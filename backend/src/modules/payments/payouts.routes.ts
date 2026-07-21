import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  approveHostController,
  getPendingHostsController,
  getAllHostsController,
  runPayoutsController,
  getMyPayoutsController,
  getPendingPayoutsController,
  getCommissionReportController,
  confirmPayoutController,
  failPayoutController,
} from './payouts.controller.js';

const router = Router();

// POST /host-approvals - Aprobar/rechazar propietario (admin)
router.post('/host-approvals', authenticate, approveHostController);

// GET /host-approvals/pending - Listar propietarios pendientes (admin)
router.get('/host-approvals/pending', authenticate, getPendingHostsController);

// GET /host-approvals - Listar todos los propietarios (admin)
router.get('/host-approvals', authenticate, getAllHostsController);

// POST /payouts/run - Ejecutar payouts pendientes (admin/cron)
router.post('/payouts/run', authenticate, runPayoutsController);

// GET /payouts/mine - Historial de payouts del propietario
router.get('/payouts/mine', authenticate, getMyPayoutsController);

// GET /admin/payouts - Listar payouts pendientes (admin)
router.get('/admin/payouts', authenticate, getPendingPayoutsController);

// GET /admin/reports/commissions - Reporte de comisiones (admin)
router.get('/admin/reports/commissions', authenticate, getCommissionReportController);

// POST /payouts/:payoutId/confirm - Confirmar pago de payout
router.post('/payouts/:payoutId/confirm', authenticate, confirmPayoutController);

// POST /payouts/:payoutId/fail - Marcar payout como fallido
router.post('/payouts/:payoutId/fail', authenticate, failPayoutController);

export default router;
