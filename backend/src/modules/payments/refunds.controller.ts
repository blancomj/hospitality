import { Request, Response } from 'express';
import { z } from 'zod';
import {
  listRefundRequests,
  approveRefundRequest,
  rejectRefundRequest,
} from './payments.service.js';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'processing', 'approved', 'rejected', 'failed']).optional(),
});

const rejectSchema = z.object({
  notes: z.string().min(3).max(500),
});

export async function listRefundsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { status } = listQuerySchema.parse(req.query);
    const refunds = await listRefundRequests(status);
    res.json({ refunds });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Parámetros inválidos', details: error.errors });
      return;
    }
    console.error('Error listando reembolsos:', error);
    res.status(500).json({ error: 'Error al listar solicitudes de reembolso' });
  }
}

export async function approveRefundController(
  req: Request,
  res: Response
): Promise<void> {
  const refundRequestId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(refundRequestId)) {
    res.status(400).json({ error: 'ID de solicitud inválido' });
    return;
  }

  try {
    const result = await approveRefundRequest(refundRequestId, req.user!.id);
    res.json({
      message: 'Reembolso ejecutado',
      refund: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    // Estos casos son del usuario, no del servidor: la solicitud ya fue
    // procesada, no existe, o Wompi rechazó la operación.
    if (
      message.includes('no encontrada') ||
      message.includes('ya fue procesada') ||
      message.includes('no tiene transacción')
    ) {
      res.status(409).json({ error: message });
      return;
    }

    if (message.includes('Wompi rechazó')) {
      res.status(502).json({ error: message });
      return;
    }

    console.error('Error aprobando reembolso:', error);
    res.status(500).json({ error: 'Error al procesar el reembolso' });
  }
}

export async function rejectRefundController(
  req: Request,
  res: Response
): Promise<void> {
  const refundRequestId = parseInt(req.params.id as string, 10);

  if (Number.isNaN(refundRequestId)) {
    res.status(400).json({ error: 'ID de solicitud inválido' });
    return;
  }

  try {
    const { notes } = rejectSchema.parse(req.body);
    const result = await rejectRefundRequest(refundRequestId, req.user!.id, notes);
    res.json({ message: 'Solicitud rechazada', refund: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }

    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message.includes('no encontrada') || message.includes('Sólo se pueden rechazar')) {
      res.status(409).json({ error: message });
      return;
    }

    console.error('Error rechazando reembolso:', error);
    res.status(500).json({ error: 'Error al rechazar la solicitud' });
  }
}
