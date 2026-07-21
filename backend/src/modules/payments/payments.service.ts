import pool from '../../db/connection.js';
import { WompiClient } from './wompi.client.js';

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
  signature: string,
  timestamp: string,
  payload: object
): Promise<{ success: boolean; message: string }> {
  const wompiClient = new WompiClient();
  const payloadString = JSON.stringify(payload);

  // Verificar firma
  if (!wompiClient.verifyWebhookSignature(signature, timestamp, payloadString)) {
    return { success: false, message: 'Invalid signature' };
  }

  const event = payload as any;
  const transactionId = event.data?.transaction?.id;

  if (!transactionId) {
    return { success: false, message: 'No transaction ID' };
  }

  // Obtener transacción de Wompi
  const transaction = await wompiClient.getTransaction(transactionId);
  const reference = transaction.reference;

  // Extraer booking_id de la referencia (formato: CS-{booking_id}-{timestamp})
  const match = reference.match(/^CS-(\d+)-/);
  if (!match) {
    return { success: false, message: 'Invalid reference format' };
  }

  const bookingId = parseInt(match[1], 10);

  // Confirmar pago si está aprobado
  if (transaction.status === 'APPROVED') {
    await confirmPayment(
      bookingId,
      transactionId,
      transaction.payment_method_type,
      payload
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

  // Obtener transacción original
  const [paymentRows] = await pool.execute(
    'SELECT wompi_transaction_id FROM payments WHERE booking_id = ? AND status = ? LIMIT 1',
    [bookingId, 'approved']
  );

  const payments = paymentRows as any[];
  if (payments.length === 0) {
    throw new Error('No approved payment found for this booking');
  }

  const transactionId = payments[0].wompi_transaction_id;

  // Crear reembolso en Wompi
  const amountInCents = Math.round(refundAmount * 100);
  const refundResponse = await wompiClient.createRefund(transactionId, amountInCents);

  // Actualizar estados en BD
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
