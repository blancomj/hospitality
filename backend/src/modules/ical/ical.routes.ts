import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireCronSecret } from '../../middleware/requireCronSecret.js';
import {
  exportIcalController,
  getIcalLinksController,
  addIcalLinkController,
  removeIcalLinkController,
  syncIcalController,
} from './ical.controller.js';

const router = Router();

router.get('/properties/:id/ical/:token.ics', exportIcalController);

router.get('/properties/:id/ical-links', authenticate, requireRole('host', 'admin'), getIcalLinksController);
router.post('/properties/:id/ical-links', authenticate, requireRole('host', 'admin'), addIcalLinkController);
router.delete('/properties/:id/ical-links/:linkId', authenticate, requireRole('host', 'admin'), removeIcalLinkController);

router.post('/ical/sync', requireCronSecret, syncIcalController);

export default router;
