import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import pool from '../../db/connection.js';
import {
  getAdminDashboardController,
  searchUsersController,
  updateUserStatusController,
  getPropertiesForModerationController,
  moderatePropertyController,
  getBookingTimelineController,
  forceCancelBookingController,
  getPlatformSettingsController,
  updatePlatformSettingController,
  getAuditLogController,
} from './admin.controller.js';

const router = Router();

/**
 * Ajustes públicos.
 *
 * Va ANTES del guard de /admin y expone únicamente las claves de esta lista.
 * platform_settings contiene también comisiones y parámetros internos, así
 * que devolver la tabla completa sin filtrar sería una fuga de negocio.
 */
const PUBLIC_SETTING_KEYS = [
  'booking_expiry_minutes',
  'min_booking_nights',
  'max_booking_nights',
  'enabled_cities',
  'cancellation_policies',
];

router.get('/settings/public', async (_req, res) => {
  try {
    const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT setting_key, setting_value, value_type
       FROM platform_settings
       WHERE setting_key IN (${placeholders})`,
      PUBLIC_SETTING_KEYS
    );

    const settings: Record<string, unknown> = {};
    for (const row of rows as any[]) {
      const raw = row.setting_value;
      settings[row.setting_key] =
        row.value_type === 'int'
          ? parseInt(raw, 10)
          : row.value_type === 'decimal'
            ? parseFloat(raw)
            : row.value_type === 'bool'
              ? raw === '1' || raw === 'true'
              : row.value_type === 'json'
                ? JSON.parse(raw)
                : raw;
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error obteniendo ajustes públicos:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

router.use('/admin', authenticate, requireRole('admin'));

router.get('/admin/dashboard', getAdminDashboardController);
router.get('/admin/users', searchUsersController);
router.patch('/admin/users/:id/status', updateUserStatusController);
router.get('/admin/properties', getPropertiesForModerationController);
router.patch('/admin/properties/:id/moderate', moderatePropertyController);
router.get('/admin/bookings/:id/timeline', getBookingTimelineController);
router.post('/admin/bookings/:id/force-cancel', forceCancelBookingController);
router.get('/admin/settings', getPlatformSettingsController);
router.put('/admin/settings/:key', updatePlatformSettingController);
router.get('/admin/audit-log', getAuditLogController);

router.post('/admin/amenity-catalog', async (req, res) => {
  try {
    const schema = z.object({
      category: z.enum(['basicos','cocina','lavanderia','espacios','edificio','familia','seguridad','accesibilidad','politicas']),
      name: z.string().min(1).max(80),
      icon: z.string().max(40),
      allowsDetail: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    });
    
    const data = schema.parse(req.body);
    const [result] = await pool.execute(
      `INSERT INTO amenity_catalog (category, name, icon, allows_detail, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [data.category, data.name, data.icon, data.allowsDetail || false, data.sortOrder || 0]
    );
    
    res.status(201).json({ id: (result as any).insertId, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error creating amenity:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.patch('/admin/amenity-catalog/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const schema = z.object({
      name: z.string().min(1).max(80).optional(),
      icon: z.string().max(40).optional(),
      allowsDetail: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    });
    
    const data = schema.parse(req.body);
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.allowsDetail !== undefined) { updates.push('allows_detail = ?'); values.push(data.allowsDetail); }
    if (data.sortOrder !== undefined) { updates.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive); }
    
    if (updates.length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }
    
    values.push(id);
    await pool.execute(`UPDATE amenity_catalog SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Amenidad actualizada' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error updating amenity:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.patch('/admin/payouts/:id/hold', async (req, res) => {
  try {
    const payoutId = req.params.id;
    const { hold } = z.object({ hold: z.boolean() }).parse(req.body);
    
    const newStatus = hold ? 'held' : 'pending';
    await pool.execute(
      'UPDATE payouts SET status = ? WHERE id = ?',
      [newStatus, payoutId]
    );
    
    res.json({ message: hold ? 'Payout retenido' : 'Payout liberado' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error updating payout hold:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
