import { Router } from 'express';
import { processBrevoWebhook } from './notifications.service.js';

const router = Router();

// POST /webhooks/brevo - Webhook de Brevo (eventos de entrega)
router.post('/webhooks/brevo', async (req, res) => {
  try {
    const signature = req.headers['x-brevo-signature'] as string || '';
    const timestamp = req.headers['x-brevo-timestamp'] as string || '';

    const result = await processBrevoWebhook(signature, timestamp, req.body);

    if (result.success) {
      res.json({ status: 'ok' });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Brevo webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
