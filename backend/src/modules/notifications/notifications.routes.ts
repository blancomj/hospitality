import { Router } from 'express';

const router = Router();

// Brevo webhook is mounted in app.ts with express.raw() middleware
// for proper HMAC signature verification with raw body access

export default router;
