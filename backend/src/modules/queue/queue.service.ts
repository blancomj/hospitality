import { Queue, Worker } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || '';

let connection: any = null;
let imageQueue: Queue | null = null;
let emailQueue: Queue | null = null;
let payoutQueue: Queue | null = null;
let syncQueue: Queue | null = null;

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

function ensureConnection(): any {
  if (!connection) {
    if (!REDIS_URL) {
      throw new Error('REDIS_URL is not set — queue features unavailable');
    }
    connection = new IORedis.default(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

function ensureQueues() {
  if (!imageQueue) {
    const conn = ensureConnection();
    imageQueue = new Queue('image-processing', { connection: conn });
    emailQueue = new Queue('email-notifications', { connection: conn });
    payoutQueue = new Queue('payout-processing', { connection: conn });
    syncQueue = new Queue('ical-sync', { connection: conn });

    createBullBoard({
      queues: [
        new BullMQAdapter(imageQueue),
        new BullMQAdapter(emailQueue),
        new BullMQAdapter(payoutQueue),
        new BullMQAdapter(syncQueue),
      ],
      serverAdapter,
    });
  }
}

export function initQueues() {
  if (REDIS_URL) {
    ensureQueues();
    console.log('🔧 BullMQ queues initialized');
  }
}

export function isQueueAvailable(): boolean {
  return !!REDIS_URL;
}

export const getQueueDashboard = () => serverAdapter.getRouter();

export const addImageJob = async (data: {
  propertyId: number;
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
}) => {
  ensureQueues();
  return imageQueue!.add('process-image', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
};

export const addEmailJob = async (data: {
  to: string;
  templateId: number;
  params: Record<string, string>;
  bookingId?: number;
  userId?: number;
}) => {
  ensureQueues();
  return emailQueue!.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  });
};

export const addPayoutJob = async (data: {
  payoutId: number;
  hostId: number;
  amount: number;
  bankAccount: string;
}) => {
  ensureQueues();
  return payoutQueue!.add('process-payout', data, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 50,
  });
};

export const addSyncJob = async (data: {
  propertyId: number;
  icalUrl: string;
  source: string;
}) => {
  ensureQueues();
  return syncQueue!.add('sync-calendar', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 60000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
};

export const startImageWorker = (processor: (job: any) => Promise<any>) => {
  const conn = ensureConnection();
  const worker = new Worker('image-processing', processor, { connection: conn });
  worker.on('failed', (job, err) => {
    console.error(`Image job ${job?.id} failed:`, err.message);
  });
  return worker;
};

export const startEmailWorker = (processor: (job: any) => Promise<any>) => {
  const conn = ensureConnection();
  const worker = new Worker('email-notifications', processor, { connection: conn });
  worker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message);
  });
  return worker;
};

export const startPayoutWorker = (processor: (job: any) => Promise<any>) => {
  const conn = ensureConnection();
  const worker = new Worker('payout-processing', processor, { connection: conn });
  worker.on('failed', (job, err) => {
    console.error(`Payout job ${job?.id} failed:`, err.message);
  });
  return worker;
};

export const startSyncWorker = (processor: (job: any) => Promise<any>) => {
  const conn = ensureConnection();
  const worker = new Worker('ical-sync', processor, { connection: conn });
  worker.on('failed', (job, err) => {
    console.error(`Sync job ${job?.id} failed:`, err.message);
  });
  return worker;
};
