import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import hostProfilesRoutes from './modules/host-profiles/host-profiles.routes.js';
import propertiesRoutes from './modules/properties/properties.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import bookingsRoutes from './modules/bookings/bookings.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import payoutsRoutes from './modules/payments/payouts.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import hostPanelRoutes from './modules/host-panel/host-panel.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import icalRoutes from './modules/ical/ical.routes.js';
import exchangeRateRoutes from './modules/currency/exchange-rate.routes.js';
import favoritesRoutes from './modules/properties/favorites.routes.js';
import { getQueueDashboard } from './modules/queue/queue.service.js';
import { getCities } from './modules/search/search.controller.js';

const app = express();

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Webhook de Wompi necesita body raw para verificar firma
app.post('/api/v1/webhooks/wompi', express.raw({ type: 'application/json' }), async (req, res) => {
  const { webhookController } = await import('./modules/payments/payments.controller.js');
  await webhookController(req, res);
});

// Webhook de Brevo necesita body raw para verificar firma
app.use('/api/v1/webhooks/brevo', express.raw({ type: 'application/json' }), async (req, res) => {
  const { processBrevoWebhook } = await import('./modules/notifications/notifications.service.js');
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

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Queue dashboard (admin only in production)
if (config.nodeEnv === 'development') {
  app.use('/admin/queues', getQueueDashboard());
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/cities', getCities);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/host-profiles', hostProfilesRoutes);
app.use('/api/v1/properties', propertiesRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1', paymentsRoutes);
app.use('/api/v1', payoutsRoutes);
app.use('/api/v1', reviewsRoutes);
app.use('/api/v1', notificationsRoutes);
app.use('/api/v1', hostPanelRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', icalRoutes);
app.use('/api/v1', exchangeRateRoutes);
app.use('/api/v1', favoritesRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
