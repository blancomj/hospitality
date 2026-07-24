import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createPaymentIntent,
  processWebhook,
  refundBookingManually,
  expirePendingPayments,
} from './payments.service.js';

const createPaymentIntentSchema = z.object({
  bookingId: z.number().int().positive(),
  // Lista cerrada a propósito: este valor termina en una URL de retorno, así
  // que no puede venir libre desde el cliente.
  locale: z.enum(['es', 'en']).default('es'),
});

export async function createPaymentIntentController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { bookingId, locale } = createPaymentIntentSchema.parse(req.body);

    const result = await createPaymentIntent(bookingId, userId, locale);

    res.json({
      paymentIntent: result,
      publicKey: process.env.WOMPI_PUBLIC_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Error al crear intención de pago' });
  }
}

export async function webhookController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await processWebhook(req.body);

    if (result.success) {
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function refundBookingController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (userRole !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden procesar reembolsos' });
      return;
    }

    const id = req.params.id as string;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const { refundAmount, reason } = req.body;

    if (typeof refundAmount !== 'number' || refundAmount <= 0) {
      res.status(400).json({ error: 'Monto de reembolso inválido' });
      return;
    }

    const result = await refundBookingManually(
      bookingId,
      userId,
      refundAmount,
      typeof reason === 'string' ? reason.slice(0, 500) : 'Reembolso manual de administración'
    );

    res.json({
      message: 'Reembolso procesado exitosamente',
      refundRequestId: result.refundRequestId,
      refundId: result.wompiRefundId,
      refundAmount,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Error al procesar reembolso' });
  }
}

export async function expirePaymentsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await expirePendingPayments();
    res.json({
      message: `${result.expiredCount} reservas expiradas`,
      expiredCount: result.expiredCount,
    });
  } catch (error) {
    console.error('Error expiring payments:', error);
    res.status(500).json({ error: 'Error al expirar pagos pendientes' });
  }
}
