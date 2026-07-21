import { Request, Response } from 'express';
import { z } from 'zod';
import {
  approveHost,
  getPendingHosts,
  getAllHosts,
} from '../host-profiles/host-approvals.service.js';
import {
  runPayouts,
  getHostPayoutHistory,
  getPendingPayouts,
  getCommissionReport,
  markPayoutPaid,
  markPayoutFailed,
} from './payouts.service.js';

const approveHostSchema = z.object({
  userId: z.number().int().positive(),
  action: z.enum(['approve', 'reject']),
});

const commissionReportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function approveHostController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      res.status(403).json({ error: 'Solo administradores pueden aprobar propietarios' });
      return;
    }

    const { userId: targetUserId, action } = approveHostSchema.parse(req.body);

    const result = await approveHost(targetUserId, action, userId);

    res.json({
      message: `Propietario ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error approving host:', error);
    res.status(500).json({ error: 'Error al procesar aprobación' });
  }
}

export async function getPendingHostsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const hosts = await getPendingHosts();
    res.json({ hosts });
  } catch (error) {
    console.error('Error fetching pending hosts:', error);
    res.status(500).json({ error: 'Error al obtener propietarios pendientes' });
  }
}

export async function getAllHostsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const hosts = await getAllHosts();
    res.json({ hosts });
  } catch (error) {
    console.error('Error fetching hosts:', error);
    res.status(500).json({ error: 'Error al obtener propietarios' });
  }
}

export async function runPayoutsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const batch = await runPayouts();

    if (batch.length === 0) {
      res.json({
        message: 'No hay payouts pendientes para procesar',
        processedCount: 0,
      });
      return;
    }

    // Here you would integrate with Wompi Pagos a Terceros API
    // For now, we just return the batch
    res.json({
      message: `${batch.length} payouts en procesamiento`,
      processedCount: batch.length,
      batch,
    });
  } catch (error) {
    console.error('Error running payouts:', error);
    res.status(500).json({ error: 'Error al ejecutar payouts' });
  }
}

export async function getMyPayoutsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const payouts = await getHostPayoutHistory(userId);
    res.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({ error: 'Error al obtener historial de payouts' });
  }
}

export async function getPendingPayoutsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const payouts = await getPendingPayouts();
    res.json({ payouts });
  } catch (error) {
    console.error('Error fetching pending payouts:', error);
    res.status(500).json({ error: 'Error al obtener payouts pendientes' });
  }
}

export async function getCommissionReportController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { from, to } = commissionReportSchema.parse(req.query);

    const report = await getCommissionReport(from, to);
    res.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Parámetros inválidos', details: error.errors });
      return;
    }
    console.error('Error fetching commission report:', error);
    res.status(500).json({ error: 'Error al obtener reporte de comisiones' });
  }
}

export async function confirmPayoutController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const payoutId = req.params.payoutId as string;
    const { wompiReference } = req.body;

    if (!payoutId || !wompiReference) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    await markPayoutPaid(parseInt(payoutId), wompiReference);
    res.json({ message: 'Pago confirmado exitosamente' });
  } catch (error) {
    console.error('Error confirming payout:', error);
    res.status(500).json({ error: 'Error al confirmar pago' });
  }
}

export async function failPayoutController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const payoutId = req.params.payoutId as string;
    const { reason } = req.body;

    if (!payoutId || !reason) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    await markPayoutFailed(parseInt(payoutId), reason);
    res.json({ message: 'Pago marcado como fallido' });
  } catch (error) {
    console.error('Error marking payout failed:', error);
    res.status(500).json({ error: 'Error al marcar pago como fallido' });
  }
}
