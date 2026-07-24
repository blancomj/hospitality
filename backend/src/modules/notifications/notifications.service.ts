import { createHmac } from 'node:crypto';
import pool from '../../db/connection.js';
import { sendTransactionalEmail, EMAIL_TEMPLATES } from './brevo.client.js';

const BREVO_WEBHOOK_KEY = process.env.BREVO_WEBHOOK_KEY || '';

function verifyBrevoSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  if (!BREVO_WEBHOOK_KEY) {
    console.warn('BREVO_WEBHOOK_KEY not configured, skipping signature verification');
    return true;
  }
  if (!signature || !timestamp) return false;
  const expected = createHmac('sha256', BREVO_WEBHOOK_KEY)
    .update(timestamp + body)
    .digest('base64');
  return expected === signature;
}

interface BookingEmailData {
  guestEmail: string;
  guestName: string;
  guestId: number;
  hostEmail: string;
  hostName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingId: number;
  expiresAt?: string | null;
  cancellationPolicy?: string;
}

interface PayoutEmailData {
  hostEmail: string;
  hostName: string;
  netAmount: number;
  wompiReference: string;
  propertyTitle: string;
  bookingId: number;
}

async function logEmail(
  userId: number | null,
  bookingId: number | null,
  brevoMessageId: string,
  templateType: string
): Promise<void> {
  await pool.execute(
    'CALL sp_log_email(?, ?, ?, ?)',
    [userId, bookingId, brevoMessageId, templateType]
  );
}

/**
 * Carga los datos de una reserva para armar cualquiera de sus correos.
 * Centralizado para que las tres notificaciones lean exactamente la misma
 * fuente y no se desincronicen entre sí.
 */
async function loadBookingEmailData(bookingId: number): Promise<BookingEmailData | null> {
  const [rows] = await pool.execute(
    `SELECT guest_email, guest_name, guest_id, host_email, host_name,
            property_title, start_date, end_date, total_amount, expires_at,
            property_cancellation_policy
     FROM v_bookings_detail WHERE booking_id = ?`,
    [bookingId]
  );

  const detail = (rows as any[])[0];
  if (!detail) return null;

  return {
    guestEmail: detail.guest_email,
    guestName: detail.guest_name,
    guestId: detail.guest_id,
    hostEmail: detail.host_email,
    hostName: detail.host_name,
    propertyTitle: detail.property_title,
    checkIn: detail.start_date,
    checkOut: detail.end_date,
    totalAmount: Number(detail.total_amount),
    bookingId,
    expiresAt: detail.expires_at,
    cancellationPolicy: detail.property_cancellation_policy,
  };
}

const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);

/**
 * Reserva apartada, pendiente de pago.
 *
 * Sólo al huésped: al propietario no le sirve saber de una reserva que puede
 * evaporarse en quince minutos, y recibiría dos correos por la misma reserva.
 */
export async function sendBookingHoldEmail(bookingId: number): Promise<void> {
  const data = await loadBookingEmailData(bookingId);
  if (!data) return;

  const minutesLeft = data.expiresAt
    ? Math.max(
        1,
        Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 60000)
      )
    : 15;

  const sent = await sendTransactionalEmail({
    to: [{ email: data.guestEmail, name: data.guestName }],
    templateId: EMAIL_TEMPLATES.BOOKING_HOLD_GUEST,
    params: {
      guestName: data.guestName,
      propertyTitle: data.propertyTitle,
      checkIn: String(data.checkIn),
      checkOut: String(data.checkOut),
      totalAmount: formatCOP(data.totalAmount),
      bookingId: String(bookingId),
      minutesLeft: String(minutesLeft),
    },
    tags: ['booking_hold'],
  });

  if (sent) {
    await logEmail(data.guestId, bookingId, `hold-${bookingId}`, 'booking_hold');
  }
}

/**
 * Reserva confirmada. Se dispara desde el webhook de Wompi, una vez el pago
 * está aprobado de verdad.
 */
export async function sendBookingConfirmedEmails(bookingId: number): Promise<void> {
  const data = await loadBookingEmailData(bookingId);
  if (!data) return;

  await sendBookingConfirmationEmails(data);
}

/**
 * Cancelación. Informa a ambas partes y, al huésped, qué pasa con su dinero.
 */
export async function sendBookingCancelledEmails(
  bookingId: number,
  refund: { refundAmount: number; refundStatus: string; policyApplied: string }
): Promise<void> {
  const data = await loadBookingEmailData(bookingId);
  if (!data) return;

  const refundMessage =
    refund.refundStatus === 'pending'
      ? `Se tramitará un reembolso de ${formatCOP(refund.refundAmount)} según la política ${refund.policyApplied}. Recibirás un aviso cuando se procese.`
      : refund.refundStatus === 'not_eligible'
        ? `Según la política ${refund.policyApplied}, esta cancelación no genera reembolso.`
        : 'No se había registrado ningún pago para esta reserva.';

  const common = {
    propertyTitle: data.propertyTitle,
    checkIn: String(data.checkIn),
    checkOut: String(data.checkOut),
    bookingId: String(bookingId),
    refundAmount: formatCOP(refund.refundAmount),
    refundMessage,
    policyApplied: refund.policyApplied,
  };

  await sendTransactionalEmail({
    to: [{ email: data.guestEmail, name: data.guestName }],
    templateId: EMAIL_TEMPLATES.BOOKING_CANCELLED,
    params: { ...common, recipientName: data.guestName, recipientRole: 'guest' },
    tags: ['booking_cancelled'],
  });

  await sendTransactionalEmail({
    to: [{ email: data.hostEmail, name: data.hostName }],
    templateId: EMAIL_TEMPLATES.BOOKING_CANCELLED,
    params: { ...common, recipientName: data.hostName, recipientRole: 'host' },
    tags: ['booking_cancelled'],
  });

  await logEmail(data.guestId, bookingId, `cancel-${bookingId}`, 'booking_cancelled');
}

export async function sendBookingConfirmationEmails(
  data: BookingEmailData
): Promise<void> {
  try {
    const guestResult = await sendTransactionalEmail({
      to: [{ email: data.guestEmail, name: data.guestName }],
      templateId: EMAIL_TEMPLATES.BOOKING_CONFIRMED_GUEST,
      params: {
        guestName: data.guestName,
        propertyTitle: data.propertyTitle,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmount: String(data.totalAmount),
        bookingId: String(data.bookingId),
      },
    });

    const hostResult = await sendTransactionalEmail({
      to: [{ email: data.hostEmail, name: data.hostName }],
      templateId: EMAIL_TEMPLATES.BOOKING_CONFIRMED_HOST,
      params: {
        hostName: data.hostName,
        guestName: data.guestName,
        propertyTitle: data.propertyTitle,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmount: String(data.totalAmount),
        bookingId: String(data.bookingId),
      },
    });

    // El resultado de Brevo indica si el envío se aceptó; registrarlo como
    // enviado sin mirarlo dejaba el log afirmando cosas que no ocurrieron.
    if (guestResult) {
      await logEmail(data.guestId, data.bookingId, `confirm-guest-${data.bookingId}`, 'booking_confirmed');
    }
    if (hostResult) {
      await logEmail(null, data.bookingId, `confirm-host-${data.bookingId}`, 'booking_confirmed');
    }
  } catch (error) {
    console.error('Error sending booking confirmation emails:', error);
    // Don't throw - email failure shouldn't block the booking
  }
}

export async function sendPayoutNotificationEmail(
  data: PayoutEmailData
): Promise<void> {
  try {
    await sendTransactionalEmail({
      to: [{ email: data.hostEmail, name: data.hostName }],
      templateId: EMAIL_TEMPLATES.PAYOUT_EXECUTED,
      params: {
        hostName: data.hostName,
        netAmount: String(data.netAmount),
        wompiReference: data.wompiReference,
        propertyTitle: data.propertyTitle,
        bookingId: String(data.bookingId),
      },
    });

    // Log email
    await logEmail(null, data.bookingId, 'payout-email-sent', 'payout_executed');
  } catch (error) {
    console.error('Error sending payout notification email:', error);
  }
}

export async function processBrevoWebhook(
  signature: string,
  timestamp: string,
  rawBody: string
): Promise<{ success: boolean; message: string }> {
  if (!verifyBrevoSignature(signature, timestamp, rawBody)) {
    return { success: false, message: 'Invalid signature' };
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { success: false, message: 'Invalid JSON' };
  }

  const messageId = event['Message-Id'];
  const status = event.event;

  if (!messageId || !status) {
    return { success: false, message: 'Missing required fields' };
  }

  try {
    await pool.execute(
      `UPDATE email_logs 
       SET status = ? 
       WHERE brevo_message_id = ?`,
      [status, messageId.replace('<', '').replace('>', '')]
    );
    return { success: true, message: 'Webhook processed' };
  } catch (error) {
    console.error('Error processing Brevo webhook:', error);
    return { success: false, message: 'Database error' };
  }
}
