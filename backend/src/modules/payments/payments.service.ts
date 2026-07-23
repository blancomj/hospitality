import pool from '../../db/connection.js';
import { WompiClient, WompiEvent } from './wompi.client.js';

interface PaymentIntentResult {
  payment_id: number;
  booking_id: number;
  amount: number;
  reference: string;
  currency: string;
}

interface PaymentConfirmationResult {
  payment_id: number;
  booking_id: number;
  total_amount: number;
  commission_amount: number;
  net_amount: number;
}

interface RefundResult {
  payment_id: number;
  booking_id: number;
  refund_amount: number;
}

export async function createPaymentIntent(
  bookingId: number,
  userId: number
): Promise<PaymentIntentResult> {
  const [rows] = await pool.execute(
    'CALL sp_create_payment_intent(?, ?)',
    [bookingId, userId]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function confirmPayment(
  bookingId: number,
  wompiTransactionId: string,
  paymentMethod: string,
  rawPayload: object
): Promise<PaymentConfirmationResult> {
  const [rows] = await pool.execute(
    'CALL sp_confirm_payment(?, ?, ?, ?)',
    [bookingId, wompiTransactionId, paymentMethod, JSON.stringify(rawPayload)]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function processRefund(
  bookingId: number,
  refundAmount: number
): Promise<RefundResult> {
  const [rows] = await pool.execute(
    'CALL sp_process_refund(?, ?)',
    [bookingId, refundAmount]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function processWebhook(
  rawBody: Buffer | string
): Promise<{ success: boolean; message: string }> {
  const wompiClient = new WompiClient();

  let event: WompiEvent;
  try {
    const raw = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    event = JSON.parse(raw) as WompiEvent;
  } catch {
    return { success: false, message: 'Invalid JSON payload' };
  }

  if (!wompiClient.verifyEventSignature(event)) {
    return { success: false, message: 'Invalid signature' };
  }

  const transactionId = event.data?.transaction?.id;
  if (!transactionId) {
    return { success: false, message: 'No transaction ID' };
  }

  const transaction = await wompiClient.getTransaction(transactionId);
  const reference = transaction.reference;

  const match = reference.match(/^CS-(\d+)-/);
  if (!match) {
    return { success: false, message: 'Invalid reference format' };
  }

  const bookingId = parseInt(match[1], 10);

  // Idempotency check
  const [existing] = await pool.execute(
    'SELECT id FROM payments WHERE wompi_transaction_id = ? AND status = ? LIMIT 1',
    [transactionId, 'approved']
  );
  if ((existing as any[]).length > 0) {
    return { success: true, message: 'Payment already processed (idempotent)' };
  }

  if (transaction.status === 'APPROVED') {
    await confirmPayment(
      bookingId,
      transactionId,
      transaction.payment_method_type,
      event
    );
    return { success: true, message: 'Payment confirmed' };
  }

  return { success: false, message: `Transaction status: ${transaction.status}` };
}

export async function refundBooking(
  bookingId: number,
  refundAmount: number
): Promise<{ refundAmount: number; wompiRefundId: string }> {
  const wompiClient = new WompiClient();

  const [paymentRows] = await pool.execute(
    'SELECT wompi_transaction_id FROM payments WHERE booking_id = ? AND status = ? LIMIT 1',
    [bookingId, 'approved']
  );

  const payments = paymentRows as any[];
  if (payments.length === 0) {
    throw new Error('No approved payment found for this booking');
  }

  const transactionId = payments[0].wompi_transaction_id;

  const amountInCents = Math.round(refundAmount * 100);
  const refundResponse = await wompiClient.createRefund(transactionId, amountInCents);

  await processRefund(bookingId, refundAmount);

  return {
    refundAmount,
    wompiRefundId: refundResponse.id,
  };
}

export async function expirePendingPayments(): Promise<{ expiredCount: number }> {
  const [rows] = await pool.execute('CALL sp_expire_pending_payments()');
  const result = (rows as any)[0][0];
  return { expiredCount: result.expired_bookings };
}
