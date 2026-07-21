import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as favoritesService from './favorites.service.js';

const router = Router();

// GET /users/me/favorites - Get user's favorite properties
router.get('/users/me/favorites', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const favorites = await favoritesService.getUserFavorites(userId);
    res.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Error fetching favorites' });
  }
});

// PUT /properties/:id/favorite - Add property to favorites
router.put('/properties/:id/favorite', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.id as string);
    
    const added = await favoritesService.addFavorite(userId, propertyId);
    if (added) {
      res.json({ message: 'Added to favorites' });
    } else {
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Error adding favorite' });
  }
});

// DELETE /properties/:id/favorite - Remove property from favorites
router.delete('/properties/:id/favorite', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.id as string);
    
    const removed = await favoritesService.removeFavorite(userId, propertyId);
    if (removed) {
      res.json({ message: 'Removed from favorites' });
    } else {
      res.status(404).json({ error: 'Favorite not found' });
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Error removing favorite' });
  }
});

// GET /properties/:id/favorite/check - Check if property is favorited
router.get('/properties/:id/favorite/check', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const propertyId = parseInt(req.params.id as string);
    
    const favorited = await favoritesService.isFavorite(userId, propertyId);
    res.json({ isFavorite: favorited });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Error checking favorite' });
  }
});

export default router;
