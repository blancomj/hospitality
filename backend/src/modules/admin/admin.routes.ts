import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware.js';
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

// GET /admin/dashboard - KPIs globales
router.get('/admin/dashboard', authenticate, getAdminDashboardController);

// GET /admin/users - Búsqueda de usuarios
router.get('/admin/users', authenticate, searchUsersController);

// PATCH /admin/users/:id/status - Suspender/reactivar usuario
router.patch('/admin/users/:id/status', authenticate, updateUserStatusController);

// GET /admin/properties - Cola de moderación
router.get('/admin/properties', authenticate, getPropertiesForModerationController);

// PATCH /admin/properties/:id/moderate - Aprobar/despublicar propiedad
router.patch('/admin/properties/:id/moderate', authenticate, moderatePropertyController);

// GET /admin/bookings/:id/timeline - Línea de tiempo de reserva
router.get('/admin/bookings/:id/timeline', authenticate, getBookingTimelineController);

// POST /admin/bookings/:id/force-cancel - Cancelación forzada
router.post('/admin/bookings/:id/force-cancel', authenticate, forceCancelBookingController);

// GET /admin/settings - Leer configuración
router.get('/admin/settings', authenticate, getPlatformSettingsController);

// PUT /admin/settings/:key - Actualizar configuración
router.put('/admin/settings/:key', authenticate, updatePlatformSettingController);

// GET /admin/audit-log - Registro de auditoría
router.get('/admin/audit-log', authenticate, getAuditLogController);

// POST /admin/amenity-catalog - Agregar amenidad al catálogo
router.post('/admin/amenity-catalog', authenticate, async (req, res) => {
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

// PATCH /admin/amenity-catalog/:id - Actualizar amenidad
router.patch('/admin/amenity-catalog/:id', authenticate, async (req, res) => {
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

// PATCH /admin/payouts/:id/hold - Retener payout en disputa
router.patch('/admin/payouts/:id/hold', authenticate, async (req, res) => {
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
