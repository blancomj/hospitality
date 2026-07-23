import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
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

const soloAdmin = [authenticate, requireRole('admin')] as const;
const soloHost = [authenticate, requireRole('host', 'admin')] as const;

router.use('/admin', authenticate, requireRole('admin'));

router.get('/admin/payouts', getPendingPayoutsController);
router.get('/admin/reports/commissions', getCommissionReportController);

router.post('/host-approvals', ...soloAdmin, approveHostController);
router.get('/host-approvals/pending', ...soloAdmin, getPendingHostsController);
router.get('/host-approvals', ...soloAdmin, getAllHostsController);

router.get('/payouts/mine', ...soloHost, getMyPayoutsController);

router.post('/payouts/run', ...soloAdmin, runPayoutsController);
router.post('/payouts/:payoutId/confirm', ...soloAdmin, confirmPayoutController);
router.post('/payouts/:payoutId/fail', ...soloAdmin, failPayoutController);

export default router;
