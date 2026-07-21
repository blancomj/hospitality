import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  createReviewController,
  replyToReviewController,
  getPropertyReviewsController,
} from './reviews.controller.js';

const router = Router();

// POST /bookings/:id/review - Crear reseña (huésped)
router.post(
  '/bookings/:id/review',
  authenticate,
  async (req, res) => {
    req.body.bookingId = parseInt(req.params.id as string, 10);
    await createReviewController(req, res);
  }
);

// GET /properties/:id/reviews - Listar reseñas de propiedad (público)
router.get(
  '/properties/:id/reviews',
  getPropertyReviewsController
);

// POST /reviews/:id/reply - Responder reseña (propietario)
router.post(
  '/reviews/:id/reply',
  authenticate,
  replyToReviewController
);

export default router;
