import pool from '../../db/connection.js';
import { WompiClient, WompiEvent } from './wompi.client.js';
import { toCents } from './money.js';
import { config } from '../../config/index.js';
import { sendBookingConfirmedEmails } from '../notifications/notifications.service.js';

interface PaymentIntentResult {
  payment_id: number;
  booking_id: number;
  amount: number;
  amount_in_cents: number;
  reference: string;
  currency: string;
  expires_at: string;
  /** Firma que Wompi valida para impedir que el monto se altere en el cliente. */
  integrity: string;
  redirect_url: string;
}

interface PaymentConfirmationResult {
  payment_id: number;
  booking_id: number;
  total_amount: number;
  commission_amount: number;
  net_amount: number;
}

export async function createPaymentIntent(
  bookingId: number,
  userId: number,
  locale: string = 'es'
): Promise<PaymentIntentResult> {
  const [rows] = await pool.execute(
    'CALL sp_create_payment_intent(?, ?)',
    [bookingId, userId]
  );

  const intent = (rows as any)[0][0];

  const amountInCents = toCents(intent.amount);
  const currency = intent.currency || 'COP';

  const wompiClient = new WompiClient();
  const integrity = wompiClient.buildIntegritySignature(
    intent.reference,
    amountInCents,
    currency
  );

  return {
    payment_id: intent.payment_id,
    booking_id: intent.booking_id,
    amount: Number(intent.amount),
    amount_in_cents: amountInCents,
    reference: intent.reference,
    currency,
    expires_at: intent.expires_at,
    integrity,
    redirect_url: `${config.frontendUrl}/${locale}/bookings/${bookingId}/payment-result`,
  };
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

/**
 * Reembolso manual iniciado por un administrador (cancelación forzada,
 * disputas, fuerza mayor). Crea la solicitud y la ejecuta de inmediato,
 * pero por el mismo camino auditable que la cola normal.
 */
export async function refundBookingManually(
  bookingId: number,
  adminId: number,
  refundAmount: number,
  reason: string
): Promise<{ refundRequestId: number; wompiRefundId: string }> {
  const [rows] = await pool.execute(
    'CALL sp_request_manual_refund(?, ?, ?, ?)',
    [bookingId, adminId, refundAmount, reason]
  );
  const refundRequestId = (rows as any)[0][0].refund_request_id;

  const result = await approveRefundRequest(refundRequestId, adminId);

  return {
    refundRequestId,
    wompiRefundId: result.wompiRefundId,
  };
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

    // CU-24: la confirmación se notifica AQUÍ, cuando el dinero entró.
    // Antes se enviaba al crear la pre-reserva, así que el huésped recibía
    // "reserva confirmada" sin haber pagado, y nada al pagar de verdad.
    try {
      await sendBookingConfirmedEmails(bookingId);
    } catch (error) {
      console.error('Fallo al enviar correos de confirmación:', error);
      // Un fallo de correo no debe invalidar un pago ya cobrado.
    }

    return { success: true, message: 'Payment confirmed' };
  }

  return { success: false, message: `Transaction status: ${transaction.status}` };
}

/**
 * Cola de reembolsos.
 *
 * Decisión de negocio: cancelar una reserva NO devuelve el dinero de forma
 * automática. sp_cancel_booking encola una solicitud con el monto que
 * corresponde según la política, y un administrador la aprueba o la rechaza.
 * Sólo al aprobar se llama a la API de Wompi.
 */
export async function listRefundRequests(
  status?: string
): Promise<any[]> {
  if (status) {
    const [rows] = await pool.execute(
      'SELECT * FROM v_refund_queue WHERE status = ? ORDER BY created_at ASC',
      [status]
    );
    return rows as any[];
  }

  const [rows] = await pool.execute(
    `SELECT * FROM v_refund_queue
     ORDER BY FIELD(status, 'pending', 'failed', 'processing', 'approved', 'rejected'),
              created_at ASC`
  );
  return rows as any[];
}

export async function approveRefundRequest(
  refundRequestId: number,
  adminId: number
): Promise<{ refundRequestId: number; bookingId: number; refundAmount: number; wompiRefundId: string }> {
  const wompiClient = new WompiClient();

  // Fase 1: reservar la solicitud. Si el admin hace doble clic, la segunda
  // llamada falla aquí y no se envían dos reembolsos a Wompi.
  const [startRows] = await pool.execute(
    'CALL sp_start_refund(?, ?)',
    [refundRequestId, adminId]
  );
  const started = (startRows as any)[0][0];

  const amountInCents = toCents(started.refund_amount);

  // Fase 2: llamar a Wompi. Si falla, la solicitud queda en 'failed' con el
  // motivo, no perdida ni marcada como reembolsada.
  let refundResponse: { id: string };
  try {
    refundResponse = await wompiClient.createRefund(
      started.wompi_transaction_id,
      amountInCents
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await pool.execute(
      'CALL sp_settle_refund(?, ?, ?, ?)',
      [refundRequestId, 0, null, reason.slice(0, 500)]
    );
    throw new Error(`Wompi rechazó el reembolso: ${reason}`);
  }

  // Fase 3: registrar el resultado exitoso.
  await pool.execute(
    'CALL sp_settle_refund(?, ?, ?, ?)',
    [refundRequestId, 1, refundResponse.id, null]
  );

  return {
    refundRequestId,
    bookingId: started.booking_id,
    refundAmount: Number(started.refund_amount),
    wompiRefundId: refundResponse.id,
  };
}

export async function rejectRefundRequest(
  refundRequestId: number,
  adminId: number,
  notes: string
): Promise<{ refundRequestId: number; status: string }> {
  const [rows] = await pool.execute(
    'CALL sp_reject_refund(?, ?, ?)',
    [refundRequestId, adminId, notes]
  );
  const result = (rows as any)[0][0];
  return { refundRequestId: result.refund_request_id, status: result.status };
}

export async function expirePendingPayments(): Promise<{ expiredCount: number }> {
  const [rows] = await pool.execute('CALL sp_expire_pending_payments()');
  const result = (rows as any)[0][0];
  return { expiredCount: result.expired_bookings };
}
