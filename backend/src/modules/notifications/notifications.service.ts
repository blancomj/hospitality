import pool from '../../db/connection.js';
import { sendTransactionalEmail, EMAIL_TEMPLATES } from './brevo.client.js';

interface BookingEmailData {
  guestEmail: string;
  guestName: string;
  hostEmail: string;
  hostName: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingId: number;
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

    // Log emails
    await logEmail(null, data.bookingId, 'guest-email-sent', 'booking_confirmed');
    await logEmail(null, data.bookingId, 'host-email-sent', 'booking_confirmed');
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
  payload: object
): Promise<{ success: boolean; message: string }> {
  const event = payload as any;
  const messageId = event['Message-Id'];
  const status = event.event;

  if (!messageId || !status) {
    return { success: false, message: 'Missing required fields' };
  }

  // Update email log status
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
