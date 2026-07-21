import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as translationsService from './translations.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireOwnership } from '../../middleware/requireOwnership.js';

const router = Router();

const translationSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().optional(),
});

// Get all translations for a property
router.get(
  '/:id/translations',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id as string;
      const translations = await translationsService.getPropertyTranslations(propertyId);
      res.json({ translations });
    } catch (error) {
      console.error('Error fetching translations:', error);
      res.status(500).json({ error: 'Error fetching translations' });
    }
  }
);

// Get a specific translation
router.get(
  '/:id/translations/:locale',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id as string;
      const locale = req.params.locale as string;
      
      const translation = await translationsService.getPropertyTranslation(propertyId, locale);
      if (!translation) {
        res.status(404).json({ error: 'Translation not found' });
        return;
      }
      
      res.json({ translation });
    } catch (error) {
      console.error('Error fetching translation:', error);
      res.status(500).json({ error: 'Error fetching translation' });
    }
  }
);

// Create or update a translation
router.put(
  '/:id/translations/:locale',
  authenticate,
  requireRole('host', 'admin'),
  requireOwnership('id', 'properties'),
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id as string;
      const locale = req.params.locale as string;
      
      // Validate locale
      if (!['es', 'en'].includes(locale)) {
        res.status(400).json({ error: 'Invalid locale. Supported: es, en' });
        return;
      }
      
      const data = translationSchema.parse(req.body);
      const translation = await translationsService.upsertPropertyTranslation(
        propertyId,
        locale,
        data.title,
        data.description || null,
        false
      );
      
      res.json({ translation });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid data', details: error.errors });
        return;
      }
      console.error('Error upserting translation:', error);
      res.status(500).json({ error: 'Error saving translation' });
    }
  }
);

// Delete a translation
router.delete(
  '/:id/translations/:locale',
  authenticate,
  requireRole('host', 'admin'),
  requireOwnership('id', 'properties'),
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id as string;
      const locale = req.params.locale as string;
      
      const deleted = await translationsService.deletePropertyTranslation(propertyId, locale);
      if (!deleted) {
        res.status(404).json({ error: 'Translation not found' });
        return;
      }
      
      res.json({ message: 'Translation deleted' });
    } catch (error) {
      console.error('Error deleting translation:', error);
      res.status(500).json({ error: 'Error deleting translation' });
    }
  }
);

export default router;
