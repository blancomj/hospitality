import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createPaymentIntentController,
  webhookController,
  refundBookingController,
  expirePaymentsController,
} from './payments.controller.js';

const router = Router();

// POST /bookings/:id/payment-intent - Crear intención de pago
router.post(
  '/bookings/:id/payment-intent',
  authenticate,
  async (req, res) => {
    req.body.bookingId = parseInt(req.params.id as string, 10);
    await createPaymentIntentController(req, res);
  }
);

// POST /webhooks/wompi - Webhook de Wompi (sin auth, valida firma)
router.post('/webhooks/wompi', webhookController);

// POST /bookings/:id/refund - Reembolsar reserva (admin)
router.post(
  '/bookings/:id/refund',
  authenticate,
  async (req, res) => {
    await refundBookingController(req, res);
  }
);

// POST /payments/expire - Expirar pagos pendientes (cron)
router.post('/payments/expire', expirePaymentsController);

export default router;
