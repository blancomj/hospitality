import pool from '../../db/connection.js';
import { BookingDetailView } from '../../types/index.js';

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

  const result = rows as any;
  return result[0][0];
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
    'CALL sp_expire_pending_bookings()'
  );

  const result = rows as any;
  return result[0][0].expired_count;
};
