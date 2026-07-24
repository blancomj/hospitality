import pool from '../../db/connection.js';

interface HostDashboard {
  host_id: number;
  bookings_this_month: number;
  income_this_month: number;
  income_total: number;
  active_properties: number;
  upcoming_checkins: number;
  upcoming_checkouts: number;
  pending_payouts: number;
  pending_payout_amount: number;
  unanswered_reviews: number;
}

interface CalendarEvent {
  property_id: number;
  property_title: string;
  date: string;
  status: string;
  booking_id: number | null;
  guest_name: string | null;
  is_blocked: boolean;
  special_price: number | null;
}

interface HostBooking {
  booking_id: number;
  property_id: number;
  property_title: string;
  property_city: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  start_date: string;
  end_date: string;
  guests_count: number;
  total_amount: number;
  status: string;
  created_at: string;
}

interface FinanceRecord {
  payout_id: number;
  booking_id: number;
  property_title: string;
  property_city: string;
  check_in: string;
  check_out: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export async function getHostDashboard(hostId: number): Promise<HostDashboard> {
  const [rows] = await pool.execute(
    'SELECT * FROM v_host_dashboard WHERE host_id = ?',
    [hostId]
  );

  const dashboard = (rows as any)[0];
  if (!dashboard) {
    return {
      host_id: hostId,
      bookings_this_month: 0,
      income_this_month: 0,
      income_total: 0,
      active_properties: 0,
      upcoming_checkins: 0,
      upcoming_checkouts: 0,
      pending_payouts: 0,
      pending_payout_amount: 0,
      unanswered_reviews: 0,
    };
  }
  return dashboard;
}

export async function getHostCalendar(
  hostId: number,
  fromDate: string,
  toDate: string
): Promise<CalendarEvent[]> {
  const [rows] = await pool.execute(
    'CALL sp_get_host_calendar(?, ?, ?)',
    [hostId, fromDate, toDate]
  );
  const result = rows as any;
  return result[0] as CalendarEvent[];
}

export async function getHostBookings(
  hostId: number,
  status?: string
): Promise<HostBooking[]> {
  const [rows] = await pool.execute(
    'CALL sp_get_host_bookings(?, ?)',
    [hostId, status || '']
  );
  const result = rows as any;
  return result[0] as HostBooking[];
}

export async function getHostFinances(
  hostId: number,
  fromDate?: string,
  toDate?: string
): Promise<FinanceRecord[]> {
  const [rows] = await pool.execute(
    'CALL sp_get_host_finances(?, ?, ?)',
    [hostId, fromDate || null, toDate || null]
  );
  const result = rows as any;
  return result[0] as FinanceRecord[];
}

export interface HostReview {
  review_id: number;
  property_id: number;
  property_title: string;
  property_city: string;
  booking_id: number;
  start_date: string;
  end_date: string;
  rating: number;
  comment: string | null;
  host_reply: string | null;
  is_unanswered: number;
  created_at: string;
  updated_at: string;
  guest_name: string;
  guest_avatar: string | null;
}

/**
 * Reseñas de todas las propiedades del propietario.
 *
 * El aislamiento va por hostId, que el controlador toma del token y nunca de
 * parámetros del cliente. Las sin responder salen primero.
 */
export async function getHostReviews(
  hostId: number,
  onlyUnanswered = false
): Promise<HostReview[]> {
  const [rows] = await pool.execute(
    'CALL sp_get_host_reviews(?, ?)',
    [hostId, onlyUnanswered ? 1 : 0]
  );
  const result = rows as any;
  return result[0] as HostReview[];
}
