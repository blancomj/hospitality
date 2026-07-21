import { Router } from 'express';
import { updateHostProfile } from '../users/users.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.patch('/me', authenticate, requireRole('host', 'admin'), updateHostProfile);

export default router;
