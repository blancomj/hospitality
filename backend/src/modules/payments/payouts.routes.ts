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

const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.post('/host-approvals', approveHostController);
adminRouter.get('/host-approvals/pending', getPendingHostsController);
adminRouter.get('/host-approvals', getAllHostsController);
adminRouter.post('/payouts/run', runPayoutsController);
adminRouter.get('/admin/payouts', getPendingPayoutsController);
adminRouter.get('/admin/reports/commissions', getCommissionReportController);
adminRouter.post('/payouts/:payoutId/confirm', confirmPayoutController);
adminRouter.post('/payouts/:payoutId/fail', failPayoutController);

const hostRouter = Router();
hostRouter.use(authenticate, requireRole('host', 'admin'));

hostRouter.get('/payouts/mine', getMyPayoutsController);

router.use(hostRouter);
router.use(adminRouter);

export default router;
