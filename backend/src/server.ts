import app from './app.js';
import { config } from './config/index.js';
import { initSentry } from './modules/monitoring/sentry.service.js';
import { initQueues, isQueueAvailable,
  startImageWorker, startEmailWorker, startPayoutWorker, startSyncWorker
} from './modules/queue/queue.service.js';
import { sendTransactionalEmail } from './modules/notifications/brevo.client.js';
import { runPayouts, markPayoutPaid, markPayoutFailed } from './modules/payments/payouts.service.js';
import { syncAllIcalLinks } from './modules/ical/ical.service.js';
import { fetchAndUpdateRates } from './modules/currency/exchange-rate.service.js';

const PORT = config.port;

// Initialize Sentry
initSentry(app);

// Initialize queue workers only if Redis is configured
if (isQueueAvailable()) {
  initQueues();

  startEmailWorker(async (job) => {
    const { to, templateId, params } = job.data;
    console.log(`📧 Sending email to ${to}`);
    await sendTransactionalEmail({
      to: [{ email: to }],
      templateId,
      params,
    });
    return { success: true };
  });

  startPayoutWorker(async (job) => {
    const { payoutId } = job.data;
    console.log(`💰 Processing payout ${payoutId}`);
    try {
      const payouts = await runPayouts();
      console.log(`✅ Payouts processed: ${payouts.length}`);
      return { success: true, count: payouts.length };
    } catch (error: any) {
      console.error(`❌ Payout failed:`, error.message);
      throw error;
    }
  });

  startSyncWorker(async (job) => {
    console.log(`📅 Syncing iCal links`);
    try {
      const result = await syncAllIcalLinks();
      console.log(`✅ iCal sync: ${result.synced} synced, ${result.failed} failed, ${result.blockedDates} dates blocked`);
      return { success: true, ...result };
    } catch (error: any) {
      console.error(`❌ iCal sync failed:`, error.message);
      throw error;
    }
  });

  console.log('🔧 Queue workers iniciados');
} else {
  console.log('⚠️  Redis no configurado — colas deshabilitadas. Configura REDIS_URL para habilitar.');
}

// Schedule recurring jobs if no Redis (using in-process intervals)
if (!isQueueAvailable() && config.nodeEnv === 'production') {
  setInterval(async () => {
    console.log('💱 Updating exchange rates...');
    await fetchAndUpdateRates();
  }, 24 * 60 * 60 * 1000);

  console.log('⏰ In-process scheduled jobs started');
}

app.listen(PORT, () => {
  console.log(`🚀 CONSTRUESCALA Hospitality API corriendo en puerto ${PORT}`);
  console.log(`📦 Entorno: ${config.nodeEnv}`);
  console.log(`🔗 Frontend: ${config.frontendUrl}`);
});
