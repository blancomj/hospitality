import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireCronSecret } from '../../middleware/requireCronSecret.js';
import {
  createPaymentIntentController,
  refundBookingController,
  expirePaymentsController,
} from './payments.controller.js';
import {
  listRefundsController,
  approveRefundController,
  rejectRefundController,
} from './refunds.controller.js';

const router = Router();

router.post(
  '/bookings/:id/payment-intent',
  authenticate,
  async (req, res) => {
    req.body.bookingId = parseInt(req.params.id as string, 10);
    await createPaymentIntentController(req, res);
  }
);

// NOTA: la ruta POST /webhooks/wompi NO se declara aquí.
// Está montada directamente en app.ts ANTES de express.json(), porque la
// verificación de firma necesita el cuerpo crudo (express.raw).

router.post(
  '/bookings/:id/refund',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    await refundBookingController(req, res);
  }
);

// Cola de reembolsos (CU-16). Cancelar encola; un administrador aprueba.
// OJO: el middleware va anclado a la ruta, nunca como router.use(mw) suelto:
// este router se monta en '/api/v1' y un guard sin ruta se ejecutaría para
// todas las peticiones del prefijo.
router.get('/refunds', authenticate, requireRole('admin'), listRefundsController);
router.post('/refunds/:id/approve', authenticate, requireRole('admin'), approveRefundController);
router.post('/refunds/:id/reject', authenticate, requireRole('admin'), rejectRefundController);

router.post('/payments/expire', requireCronSecret, expirePaymentsController);

export default router;
