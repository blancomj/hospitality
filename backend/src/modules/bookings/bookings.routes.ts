import { Router } from 'express';
import * as bookingsController from './bookings.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireOwnership } from '../../middleware/requireOwnership.js';

const router = Router();

// POST /bookings - Crear pre-reserva (pending_payment)
router.post('/', authenticate, bookingsController.createBooking);

// GET /bookings/mine - Reservas del huésped autenticado
router.get('/mine', authenticate, bookingsController.getMyBookings);

// GET /bookings/:id - Detalle de una reserva
router.get('/:id', authenticate, bookingsController.getBooking);

// GET /bookings/property/:propertyId - Reservas de una propiedad
//
// requireOwnership es imprescindible aquí: requireRole sólo comprueba que
// quien pregunta sea propietario, no que sea propietario DE ESTA propiedad.
// Sin él, cualquier anfitrión podía leer las reservas ajenas, con nombre,
// correo y teléfono de los huéspedes.
router.get(
  '/property/:propertyId',
  authenticate,
  requireRole('host', 'admin'),
  requireOwnership('propertyId', 'properties'),
  bookingsController.getPropertyBookings
);

// GET /bookings/:id/cancellation-quote - Cuánto se reembolsaría, sin cancelar
router.get('/:id/cancellation-quote', authenticate, bookingsController.getCancellationQuote);

// POST /bookings/:id/cancel - Cancelar reserva
router.post('/:id/cancel', authenticate, bookingsController.cancelBookingController);

export default router;
