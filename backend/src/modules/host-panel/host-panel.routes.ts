import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getHostDashboardController,
  getHostCalendarController,
  getHostBookingsController,
  getHostFinancesController,
} from './host-panel.controller.js';

const router = Router();

// GET /host/dashboard - Dashboard del propietario
router.get('/host/dashboard', authenticate, getHostDashboardController);

// GET /host/calendar - Calendario multi-propiedad
router.get('/host/calendar', authenticate, getHostCalendarController);

// GET /host/bookings - Reservas del propietario
router.get('/host/bookings', authenticate, getHostBookingsController);

// GET /host/finances - Historial financiero
router.get('/host/finances', authenticate, getHostFinancesController);

export default router;
