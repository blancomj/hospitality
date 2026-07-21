import { Request, Response } from 'express';
import { z } from 'zod';
import {
  getAdminKPIs,
  searchUsers,
  updateUserStatus,
  getPropertiesForModeration,
  moderateProperty,
  getBookingTimeline,
  forceCancelBooking,
  getPlatformSettings,
  updatePlatformSetting,
  getAuditLog,
} from './admin.service.js';

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  reason: z.string().max(500).optional(),
});

const moderatePropertySchema = z.object({
  action: z.enum(['approve', 'unpublish']),
  reason: z.string().max(500).optional(),
});

const forceCancelSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
  refundAmount: z.number().positive().optional(),
});

const updateSettingSchema = z.object({
  value: z.string().max(500),
});

export async function getAdminDashboardController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const kpis = await getAdminKPIs(from, to);
    res.json({ kpis });
  } catch (error) {
    console.error('Error fetching admin KPIs:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
}

export async function searchUsersController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const q = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;
    const users = await searchUsers(q, status);
    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
}

export async function updateUserStatusController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const userId = parseInt(req.params.id as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const { status, reason } = updateUserStatusSchema.parse(req.body);
    await updateUserStatus(userId, status, adminId, reason);

    res.json({ message: `Usuario ${status === 'active' ? 'reactivado' : 'suspendido'} exitosamente` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

export async function getPropertiesForModerationController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const properties = await getPropertiesForModeration(status);
    res.json({ properties });
  } catch (error) {
    console.error('Error fetching properties for moderation:', error);
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
}

export async function moderatePropertyController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const propertyId = parseInt(req.params.id as string, 10);
    if (isNaN(propertyId)) {
      res.status(400).json({ error: 'ID de propiedad inválido' });
      return;
    }

    const { action, reason } = moderatePropertySchema.parse(req.body);
    await moderateProperty(propertyId, action, adminId, reason);

    res.json({ message: `Propiedad ${action === 'approve' ? 'aprobada' : 'despublicada'} exitosamente` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error moderating property:', error);
    res.status(500).json({ error: 'Error al moderar propiedad' });
  }
}

export async function getBookingTimelineController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const bookingId = parseInt(req.params.id as string, 10);
    if (isNaN(bookingId)) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const timeline = await getBookingTimeline(bookingId);
    if (!timeline) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }

    res.json({ timeline });
  } catch (error) {
    console.error('Error fetching booking timeline:', error);
    res.status(500).json({ error: 'Error al obtener línea de tiempo' });
  }
}

export async function forceCancelBookingController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const bookingId = parseInt(req.params.id as string, 10);
    if (isNaN(bookingId)) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const { reason, refundAmount } = forceCancelSchema.parse(req.body);
    await forceCancelBooking(bookingId, adminId, reason, refundAmount);

    res.json({ message: 'Reserva cancelada exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error force cancelling booking:', error);
    res.status(500).json({ error: 'Error al cancelar reserva' });
  }
}

export async function getPlatformSettingsController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
}

export async function updatePlatformSettingController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const key = req.params.key as string;
    const { value } = updateSettingSchema.parse(req.body);

    await updatePlatformSetting(key, value, adminId);
    res.json({ message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
}

export async function getAuditLogController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const targetType = req.query.target as string | undefined;
    const adminId = req.query.admin ? parseInt(req.query.admin as string, 10) : undefined;

    const log = await getAuditLog(targetType, adminId);
    res.json({ log });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Error al obtener registro de auditoría' });
  }
}
