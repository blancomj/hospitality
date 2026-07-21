import { Router } from 'express';
import * as usersController from './users.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/me', authenticate, usersController.getMe);
router.patch('/me', authenticate, usersController.updateMe);
router.post('/me/become-host', authenticate, usersController.becomeHost);

export default router;
