import { Router } from 'express';
import * as bookingsController from './bookings.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireOwnership } from '../../middleware/requireOwnership.js';

const router = Router();

// POST /bookings - Create a pre-booking (pending_payment)
router.post('/', authenticate, bookingsController.createBooking);

// GET /bookings/mine - Get guest's bookings
router.get('/mine', authenticate, bookingsController.getMyBookings);

// GET /bookings/:id - Get booking detail
router.get('/:id', authenticate, bookingsController.getBooking);

// GET /properties/:propertyId/bookings - Get bookings for a property (host only)
router.get('/property/:propertyId', authenticate, requireRole('host', 'admin'), bookingsController.getPropertyBookings);

// POST /bookings/:id/cancel - Cancel a booking
router.post('/:id/cancel', authenticate, bookingsController.cancelBookingController);

export default router;
