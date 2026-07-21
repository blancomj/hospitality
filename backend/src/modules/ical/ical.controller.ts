import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generateIcalExport,
  getPropertyIcalLinks,
  addIcalLink,
  removeIcalLink,
  syncAllIcalLinks,
} from './ical.service.js';
import pool from '../../db/connection.js';

const addIcalLinkSchema = z.object({
  sourceName: z.string().min(1).max(100),
  icalUrl: z.string().url(),
});

export async function exportIcalController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const propertyId = parseInt(req.params.id as string, 10);
    const token = req.params.token as string;

    if (isNaN(propertyId) || !token) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    // Verify token matches property
    const [rows] = await pool.execute(
      'SELECT id FROM properties WHERE id = ? AND ical_export_token = ?',
      [propertyId, token]
    );

    if ((rows as any[]).length === 0) {
      res.status(404).json({ error: 'Propiedad no encontrada o token inválido' });
      return;
    }

    // Get bookings for this property
    const [bookings] = await pool.execute(
      "SELECT start_date, end_date, status FROM bookings WHERE property_id = ? AND status IN ('confirmed', 'completed')",
      [propertyId]
    );

    const ical = generateIcalExport(propertyId, token, bookings as any[]);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="property-${propertyId}.ics"`);
    res.send(ical);
  } catch (error) {
    console.error('Error exporting iCal:', error);
    res.status(500).json({ error: 'Error al exportar iCal' });
  }
}

export async function getIcalLinksController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const propertyId = parseInt(req.params.id as string, 10);
    if (isNaN(propertyId)) {
      res.status(400).json({ error: 'ID de propiedad inválido' });
      return;
    }

    // Verify ownership
    const [ownership] = await pool.execute(
      'SELECT host_id FROM properties WHERE id = ?',
      [propertyId]
    );
    const property = (ownership as any[])[0];
    if (!property || property.host_id !== userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const links = await getPropertyIcalLinks(propertyId);
    res.json({ links });
  } catch (error) {
    console.error('Error fetching iCal links:', error);
    res.status(500).json({ error: 'Error al obtener enlaces iCal' });
  }
}

export async function addIcalLinkController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const propertyId = parseInt(req.params.id as string, 10);
    if (isNaN(propertyId)) {
      res.status(400).json({ error: 'ID de propiedad inválido' });
      return;
    }

    // Verify ownership
    const [ownership] = await pool.execute(
      'SELECT host_id FROM properties WHERE id = ?',
      [propertyId]
    );
    const property = (ownership as any[])[0];
    if (!property || property.host_id !== userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    const { sourceName, icalUrl } = addIcalLinkSchema.parse(req.body);
    const link = await addIcalLink(propertyId, sourceName, icalUrl);

    res.status(201).json({
      message: 'Enlace iCal agregado exitosamente',
      link,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error adding iCal link:', error);
    res.status(500).json({ error: 'Error al agregar enlace iCal' });
  }
}

export async function removeIcalLinkController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const propertyId = parseInt(req.params.id as string, 10);
    const linkId = parseInt(req.params.linkId as string, 10);
    if (isNaN(propertyId) || isNaN(linkId)) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    // Verify ownership
    const [ownership] = await pool.execute(
      'SELECT host_id FROM properties WHERE id = ?',
      [propertyId]
    );
    const property = (ownership as any[])[0];
    if (!property || property.host_id !== userId) {
      res.status(403).json({ error: 'No autorizado' });
      return;
    }

    await removeIcalLink(linkId, propertyId);
    res.json({ message: 'Enlace iCal eliminado' });
  } catch (error) {
    console.error('Error removing iCal link:', error);
    res.status(500).json({ error: 'Error al eliminar enlace iCal' });
  }
}

export async function syncIcalController(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const result = await syncAllIcalLinks();
    res.json({
      message: 'Sincronización completada',
      synced: result.synced,
      failed: result.failed,
      blockedDates: result.blockedDates,
    });
  } catch (error) {
    console.error('Error syncing iCal:', error);
    res.status(500).json({ error: 'Error al sincronizar iCal' });
  }
}
