import { Request, Response } from 'express';
import {
  getHostDashboard,
  getHostCalendar,
  getHostBookings,
  getHostFinances,
} from './host-panel.service.js';

export async function getHostDashboardController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const dashboard = await getHostDashboard(userId);
    res.json({ dashboard });
  } catch (error) {
    console.error('Error fetching host dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
}

export async function getHostCalendarController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const from = req.query.from as string || new Date().toISOString().split('T')[0];
    const to = req.query.to as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const calendar = await getHostCalendar(userId, from, to);
    res.json({ calendar });
  } catch (error) {
    console.error('Error fetching host calendar:', error);
    res.status(500).json({ error: 'Error al obtener calendario' });
  }
}

export async function getHostBookingsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const status = req.query.status as string | undefined;
    const bookings = await getHostBookings(userId, status);
    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching host bookings:', error);
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
}

export async function getHostFinancesController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const format = req.query.format as string | undefined;

    const finances = await getHostFinances(userId, from, to);

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Propiedad', 'Ciudad', 'Check-in', 'Check-out', 'Bruto', 'Comisión', 'Neto', 'Estado'];
      const rows = finances.map(f => [
        f.property_title,
        f.property_city,
        f.check_in,
        f.check_out,
        f.gross_amount,
        f.commission_amount,
        f.net_amount,
        f.status,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=finances-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
      return;
    }

    res.json({ finances });
  } catch (error) {
    console.error('Error fetching host finances:', error);
    res.status(500).json({ error: 'Error al obtener finanzas' });
  }
}
