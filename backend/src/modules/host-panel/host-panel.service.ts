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
  wompi_payout_reference: string | null;
  paid_at: string | null;
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
    `SELECT 
      p.id AS property_id,
      p.title AS property_title,
      cal.date,
      CASE 
        WHEN b.id IS NOT NULL THEN b.status
        WHEN ao.is_blocked = 1 THEN 'blocked'
        ELSE 'available'
      END AS status,
      b.id AS booking_id,
      u.full_name AS guest_name,
      COALESCE(ao.is_blocked, 0) AS is_blocked,
      ao.special_price
    FROM properties p
    LEFT JOIN bookings b ON p.id = b.property_id 
      AND b.start_date <= cal.date 
      AND b.end_date > cal.date
      AND b.status IN ('confirmed', 'completed')
    LEFT JOIN users u ON b.guest_id = u.id
    LEFT JOIN availability_overrides ao ON p.id = ao.property_id AND ao.date = cal.date
    CROSS JOIN (
      SELECT DATE_ADD(?, INTERVAL seq DAY) AS date
      FROM (
        SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
        UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
        UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
        UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
        UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
      ) dates
      WHERE DATE_ADD(?, INTERVAL seq DAY) <= ?
    ) cal
    WHERE p.host_id = ?
    ORDER BY p.id, cal.date`,
    [fromDate, fromDate, toDate, hostId]
  );

  return rows as CalendarEvent[];
}

export async function getHostBookings(
  hostId: number,
  status?: string
): Promise<HostBooking[]> {
  let query = `
    SELECT 
      b.id AS booking_id,
      b.property_id,
      p.title AS property_title,
      p.city AS property_city,
      u.full_name AS guest_name,
      u.email AS guest_email,
      u.phone AS guest_phone,
      b.start_date,
      b.end_date,
      b.guests_count,
      b.total_amount,
      b.status,
      b.created_at
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN users u ON b.guest_id = u.id
    WHERE p.host_id = ?
  `;
  const params: any[] = [hostId];

  if (status) {
    query += ' AND b.status = ?';
    params.push(status);
  }

  query += ' ORDER BY b.start_date DESC';

  const [rows] = await pool.execute(query, params);
  return rows as HostBooking[];
}

export async function getHostFinances(
  hostId: number,
  fromDate?: string,
  toDate?: string
): Promise<FinanceRecord[]> {
  let query = `
    SELECT 
      py.id AS payout_id,
      py.booking_id,
      p.title AS property_title,
      p.city AS property_city,
      b.start_date AS check_in,
      b.end_date AS check_out,
      py.gross_amount,
      py.commission_amount,
      py.net_amount,
      py.status,
      py.wompi_payout_reference,
      py.paid_at,
      py.created_at
    FROM payouts py
    JOIN bookings b ON py.booking_id = b.id
    JOIN properties p ON b.property_id = p.id
    WHERE py.host_id = ?
  `;
  const params: any[] = [hostId];

  if (fromDate) {
    query += ' AND py.created_at >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND py.created_at <= ?';
    params.push(toDate + ' 23:59:59');
  }

  query += ' ORDER BY py.created_at DESC';

  const [rows] = await pool.execute(query, params);
  return rows as FinanceRecord[];
}
