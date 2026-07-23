import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/firebase', authController.firebaseLogin);

// NOTA: se eliminó POST /auth/google.
// Era una vía de autenticación paralela, anterior a la migración a Firebase,
// que emitía JWT saltándose por completo el flujo de Firebase. Mantener dos
// caminos de login duplica la superficie de ataque y la lógica a auditar.
// Si algún cliente antiguo aún lo llama, debe migrarse a /auth/firebase.

router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);

export default router;
