import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  getHostDashboardController,
  getHostCalendarController,
  getHostBookingsController,
  getHostFinancesController,
} from './host-panel.controller.js';

const router = Router();

router.use('/host', authenticate, requireRole('host', 'admin'));

router.get('/host/dashboard', getHostDashboardController);
router.get('/host/calendar', getHostCalendarController);
router.get('/host/bookings', getHostBookingsController);
router.get('/host/finances', getHostFinancesController);

export default router;
