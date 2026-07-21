import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createReview,
  replyToReview,
  getPropertyReviews,
  getPropertyAverageRating,
} from './reviews.service.js';

const createReviewSchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const replyReviewSchema = z.object({
  reply: z.string().min(1).max(1000),
});

export async function createReviewController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { bookingId, rating, comment } = createReviewSchema.parse(req.body);

    const result = await createReview(bookingId, userId, rating, comment || null);

    res.status(201).json({
      message: 'Reseña creada exitosamente',
      review: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
}

export async function replyToReviewController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || userRole !== 'host') {
      res.status(403).json({ error: 'Solo propietarios pueden responder reseñas' });
      return;
    }

    const { id } = req.params;
    const reviewId = parseInt(id as string, 10);
    if (isNaN(reviewId)) {
      res.status(400).json({ error: 'ID de reseña inválido' });
      return;
    }

    const { reply } = replyReviewSchema.parse(req.body);

    const result = await replyToReview(reviewId, userId, reply);

    res.json({
      message: 'Respuesta enviada exitosamente',
      review: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error replying to review:', error);
    res.status(500).json({ error: 'Error al responder reseña' });
  }
}

export async function getPropertyReviewsController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const propertyId = parseInt(id as string, 10);
    if (isNaN(propertyId)) {
      res.status(400).json({ error: 'ID de propiedad inválido' });
      return;
    }

    const [reviews, stats] = await Promise.all([
      getPropertyReviews(propertyId),
      getPropertyAverageRating(propertyId),
    ]);

    res.json({
      reviews,
      stats,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
}
