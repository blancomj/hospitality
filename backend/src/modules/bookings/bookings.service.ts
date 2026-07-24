import pool from '../../db/connection.js';
import { BookingDetailView } from '../../types/index.js';
import {
  sendBookingHoldEmail,
  sendBookingCancelledEmails,
} from '../notifications/notifications.service.js';

export interface CreateBookingData {
  propertyId: number;
  guestId: number;
  startDate: string;
  endDate: string;
  guestsCount: number;
}

export const createBooking = async (data: CreateBookingData): Promise<any> => {
  const [rows] = await pool.execute(
    'CALL sp_create_booking(?, ?, ?, ?, ?)',
    [
      data.propertyId,
      data.guestId,
      data.startDate,
      data.endDate,
      data.guestsCount,
    ]
  );

  const result = rows as any;
  const booking = result[0][0];

  // La reserva todavía NO está confirmada: está apartada y pendiente de pago.
  // Enviar aquí el correo de "reserva confirmada" era incorrecto — el huésped
  // lo recibía sin haber pagado, y no recibía nada al pagar de verdad.
  // La confirmación (CU-24) se envía desde el webhook de Wompi.
  try {
    await sendBookingHoldEmail(booking.booking_id || booking.id);
  } catch (error) {
    console.error('Fallo al enviar correo de reserva apartada:', error);
    // Un fallo de correo no debe impedir que la reserva exista.
  }

  return booking;
};

/**
 * Cotiza la cancelación sin ejecutarla: permite mostrar al huésped o al
 * propietario cuánto se reembolsaría antes de que confirme.
 */
export const quoteCancellation = async (
  bookingId: number,
  userId: number
): Promise<any> => {
  const [rows] = await pool.execute(
    'CALL sp_quote_cancellation(?, ?)',
    [bookingId, userId]
  );

  const result = rows as any;
  return result[0][0];
};

export const cancelBooking = async (
  bookingId: number,
  userId: number,
  reason: string
): Promise<any> => {
  const [rows] = await pool.execute(
    'CALL sp_cancel_booking(?, ?, ?)',
    [bookingId, userId, reason]
  );

  const result = (rows as any)[0][0];

  try {
    await sendBookingCancelledEmails(bookingId, {
      refundAmount: Number(result.refund_amount ?? 0),
      refundStatus: result.refund_status ?? 'none',
      policyApplied: result.policy_applied ?? '',
    });
  } catch (error) {
    console.error('Fallo al enviar correos de cancelación:', error);
  }

  return result;
};

export const getBookingById = async (bookingId: number): Promise<BookingDetailView | null> => {
  const [rows] = await pool.execute<BookingDetailView[]>(
    'SELECT * FROM v_bookings_detail WHERE booking_id = ?',
    [bookingId]
  );
  
  return rows.length > 0 ? rows[0] : null;
};

export const getBookingsByGuest = async (guestId: number): Promise<BookingDetailView[]> => {
  const [rows] = await pool.execute<BookingDetailView[]>(
    `SELECT * FROM v_bookings_detail 
     WHERE guest_id = ? 
     ORDER BY start_date DESC`,
    [guestId]
  );
  return rows;
};

export const getBookingsByProperty = async (propertyId: number): Promise<BookingDetailView[]> => {
  const [rows] = await pool.execute<BookingDetailView[]>(
    `SELECT * FROM v_bookings_detail 
     WHERE property_id = ? 
     ORDER BY start_date DESC`,
    [propertyId]
  );
  return rows;
};

export const expirePendingBookings = async (): Promise<number> => {
  const [rows] = await pool.execute(
    'CALL sp_expire_pending_payments()'
  );

  const result = rows as any;
  return result[0][0].expired_bookings;
};
