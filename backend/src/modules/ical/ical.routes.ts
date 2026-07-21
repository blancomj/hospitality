import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  exportIcalController,
  getIcalLinksController,
  addIcalLinkController,
  removeIcalLinkController,
  syncIcalController,
} from './ical.controller.js';

const router = Router();

// GET /properties/:id/ical/:token.ics - Exportar calendario iCal (público)
router.get('/properties/:id/ical/:token.ics', exportIcalController);

// GET /properties/:id/ical-links - Listar enlaces iCal importados
router.get('/properties/:id/ical-links', authenticate, getIcalLinksController);

// POST /properties/:id/ical-links - Agregar enlace iCal externo
router.post('/properties/:id/ical-links', authenticate, addIcalLinkController);

// DELETE /properties/:id/ical-links/:linkId - Eliminar enlace iCal
router.delete('/properties/:id/ical-links/:linkId', authenticate, removeIcalLinkController);

// POST /ical/sync - Sincronizar todos los enlaces iCal (cron/admin)
router.post('/ical/sync', syncIcalController);

export default router;
