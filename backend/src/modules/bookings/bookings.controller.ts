import { Request, Response } from 'express';
import { z } from 'zod';
import * as bookingsService from './bookings.service.js';

const createBookingSchema = z.object({
  propertyId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestsCount: z.number().int().min(1).max(50),
});

const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createBookingSchema.parse(req.body);
    
    const booking = await bookingsService.createBooking({
      propertyId: data.propertyId,
      guestId: req.user!.id,
      startDate: data.startDate,
      endDate: data.endDate,
      guestsCount: data.guestsCount,
    });

    res.status(201).json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    
    const errorMessage = (error as any).message || 'Error al crear reserva';
    if (errorMessage.includes('not available') || errorMessage.includes('blocked')) {
      res.status(409).json({ error: errorMessage });
      return;
    }
    
    console.error('Error en createBooking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookings = await bookingsService.getBookingsByGuest(req.user!.id);
    res.json({ bookings });
  } catch (error) {
    console.error('Error en getMyBookings:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const booking = await bookingsService.getBookingById(parseInt(id));

    if (!booking) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }

    // Check authorization: guest, host, or admin
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    if (booking.guest_id !== userId && 
        booking.property_host_id !== userId && 
        userRole !== 'admin') {
      res.status(403).json({ error: 'No tienes acceso a esta reserva' });
      return;
    }

    res.json({ booking });
  } catch (error) {
    console.error('Error en getBooking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getPropertyBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId as string;
    const bookings = await bookingsService.getBookingsByProperty(parseInt(propertyId));
    res.json({ bookings });
  } catch (error) {
    console.error('Error en getPropertyBookings:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getCancellationQuote = async (req: Request, res: Response): Promise<void> => {
  try {
    const bookingId = parseInt(req.params.id as string, 10);

    if (Number.isNaN(bookingId)) {
      res.status(400).json({ error: 'ID de reserva inválido' });
      return;
    }

    const quote = await bookingsService.quoteCancellation(bookingId, req.user!.id);
    res.json({ quote });
  } catch (error) {
    const errorMessage = (error as any).message || '';

    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: 'Reserva no encontrada' });
      return;
    }
    if (errorMessage.includes('Unauthorized')) {
      res.status(403).json({ error: 'No tienes acceso a esta reserva' });
      return;
    }

    console.error('Error en getCancellationQuote:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const cancelBookingController = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { reason } = cancelBookingSchema.parse(req.body);

    const result = await bookingsService.cancelBooking(
      parseInt(id),
      req.user!.id,
      reason || 'No reason provided'
    );

    res.json({ cancellation: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    
    const errorMessage = (error as any).message || 'Error al cancelar reserva';
    if (errorMessage.includes('not found') || errorMessage.includes('Unauthorized') || errorMessage.includes('cannot be cancelled')) {
      res.status(400).json({ error: errorMessage });
      return;
    }
    
    console.error('Error en cancelBooking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
