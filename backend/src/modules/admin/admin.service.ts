import pool from '../../db/connection.js';

interface AdminKPIs {
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  gmv: number;
  commissions_generated: number;
  pending_payouts: number;
  pending_payout_amount: number;
  paid_payouts: number;
  paid_payout_amount: number;
  total_users: number;
  new_users_30d: number;
  total_hosts: number;
  pending_host_approvals: number;
  active_properties: number;
}

interface UserListItem {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
}

interface PropertyModerationItem {
  id: number;
  host_id: number;
  host_name: string;
  title: string;
  city: string;
  status: string;
  created_at: string;
}

interface BookingTimeline {
  booking_id: number;
  property_title: string;
  guest_name: string;
  status: string;
  total_amount: number;
  events: Array<{
    event_type: string;
    event_date: string;
    details: string;
  }>;
}

interface PlatformSetting {
  setting_key: string;
  setting_value: string;
  value_type: string;
  updated_at: string;
}

interface AuditLogEntry {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  old_value: any;
  new_value: any;
  reason: string | null;
  created_at: string;
}

export async function getAdminKPIs(
  fromDate?: string,
  toDate?: string
): Promise<AdminKPIs> {
  let query = 'SELECT * FROM v_admin_kpis';
  const params: any[] = [];

  if (fromDate && toDate) {
    query = `
      SELECT
        COUNT(DISTINCT b.id) AS total_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) AS confirmed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END), 0) AS gmv,
        COALESCE(SUM(CASE WHEN py.status IN ('paid', 'processing') THEN py.commission_amount ELSE 0 END), 0) AS commissions_generated,
        (SELECT COUNT(*) FROM payouts WHERE status = 'pending') AS pending_payouts,
        (SELECT COALESCE(SUM(net_amount), 0) FROM payouts WHERE status = 'pending') AS pending_payout_amount,
        (SELECT COUNT(*) FROM payouts WHERE status = 'paid') AS paid_payouts,
        (SELECT COALESCE(SUM(net_amount), 0) FROM payouts WHERE status = 'paid') AS paid_payout_amount,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS new_users_30d,
        (SELECT COUNT(*) FROM users WHERE role = 'host') AS total_hosts,
        (SELECT COUNT(*) FROM host_profiles WHERE approval_status = 'pending_approval') AS pending_host_approvals,
        (SELECT COUNT(*) FROM properties WHERE status = 'published') AS active_properties
      FROM bookings b
      LEFT JOIN payouts py ON b.id = py.booking_id
      WHERE b.created_at BETWEEN ? AND ?
    `;
    params.push(fromDate, toDate + ' 23:59:59');
  }

  const [rows] = await pool.execute(query, params);
  return (rows as any)[0] || {};
}

export async function searchUsers(
  query?: string,
  status?: string
): Promise<UserListItem[]> {
  let sql = `
    SELECT id, full_name, email, role, status, avatar_url, created_at
    FROM users
    WHERE 1=1
  `;
  const params: any[] = [];

  if (query) {
    sql += ' AND (full_name LIKE ? OR email LIKE ?)';
    params.push(`%${query}%`, `%${query}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const [rows] = await pool.execute(sql, params);
  return rows as UserListItem[];
}

export async function updateUserStatus(
  userId: number,
  newStatus: 'active' | 'suspended',
  adminId: number,
  reason?: string
): Promise<void> {
  // Get current status
  const [currentRows] = await pool.execute(
    'SELECT status FROM users WHERE id = ?',
    [userId]
  );
  const current = (currentRows as any)[0];
  if (!current) throw new Error('User not found');

  const oldStatus = current.status;

  // Update user status
  await pool.execute(
    'UPDATE users SET status = ? WHERE id = ?',
    [newStatus, userId]
  );

  // If suspending a host, unpublish their properties
  if (newStatus === 'suspended') {
    await pool.execute(
      "UPDATE properties SET status = 'paused' WHERE host_id = ? AND status = 'published'",
      [userId]
    );
  }

  // Log audit
  await pool.execute(
    'CALL sp_log_admin_action(?, ?, ?, ?, ?, ?, ?)',
    [
      adminId,
      'update_user_status',
      'user',
      userId,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status: newStatus }),
      reason || null,
    ]
  );
}

export async function getPropertiesForModeration(
  status?: string
): Promise<PropertyModerationItem[]> {
  let sql = `
    SELECT 
      p.id,
      p.host_id,
      u.full_name AS host_name,
      p.title,
      p.city,
      p.status,
      p.created_at
    FROM properties p
    JOIN users u ON p.host_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  } else {
    sql += " AND p.status = 'draft'";
  }

  sql += ' ORDER BY p.created_at DESC';

  const [rows] = await pool.execute(sql, params);
  return rows as PropertyModerationItem[];
}

export async function moderateProperty(
  propertyId: number,
  action: 'approve' | 'unpublish',
  adminId: number,
  reason?: string
): Promise<void> {
  const [currentRows] = await pool.execute(
    'SELECT status FROM properties WHERE id = ?',
    [propertyId]
  );
  const current = (currentRows as any)[0];
  if (!current) throw new Error('Property not found');

  const oldStatus = current.status;
  const newStatus = action === 'approve' ? 'published' : 'paused';

  await pool.execute(
    'UPDATE properties SET status = ? WHERE id = ?',
    [newStatus, propertyId]
  );

  await pool.execute(
    'CALL sp_log_admin_action(?, ?, ?, ?, ?, ?, ?)',
    [
      adminId,
      action === 'approve' ? 'approve_property' : 'unpublish_property',
      'property',
      propertyId,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status: newStatus }),
      reason || null,
    ]
  );
}

export async function getBookingTimeline(
  bookingId: number
): Promise<BookingTimeline | null> {
  const [bookingRows] = await pool.execute(
    `SELECT 
      b.id AS booking_id,
      p.title AS property_title,
      u.full_name AS guest_name,
      b.status,
      b.total_amount
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN users u ON b.guest_id = u.id
    WHERE b.id = ?`,
    [bookingId]
  );

  const booking = (bookingRows as any)[0];
  if (!booking) return null;

  // Get events from email_logs and status changes
  const [eventRows] = await pool.execute(
    `SELECT 
      'email_sent' AS event_type,
      el.created_at AS event_date,
      CONCAT(el.template_type, ' - ', el.status) AS details
    FROM email_logs el
    WHERE el.booking_id = ?
    UNION ALL
    SELECT
      'status_change' AS event_type,
      b.created_at AS event_date,
      CONCAT('Booking created - ', b.status) AS details
    FROM bookings b
    WHERE b.id = ?
    ORDER BY event_date ASC`,
    [bookingId, bookingId]
  );

  return {
    ...booking,
    events: eventRows as any[],
  };
}

export async function forceCancelBooking(
  bookingId: number,
  adminId: number,
  reason: string,
  refundAmount?: number
): Promise<void> {
  const [currentRows] = await pool.execute(
    'SELECT status FROM bookings WHERE id = ?',
    [bookingId]
  );
  const current = (currentRows as any)[0];
  if (!current) throw new Error('Booking not found');

  const oldStatus = current.status;

  // Cancel booking
  await pool.execute(
    "UPDATE bookings SET status = 'cancelled', cancellation_reason = ?, cancelled_by = ?, cancelled_at = NOW() WHERE id = ?",
    [reason, adminId, bookingId]
  );

  // Si se indicó un monto, el reembolso pasa por Wompi de verdad.
  // La versión anterior sólo cambiaba estados en la base: la reserva quedaba
  // marcada como reembolsada y el dinero nunca salía de la cuenta.
  if (refundAmount && refundAmount > 0) {
    const { refundBookingManually } = await import('../payments/payments.service.js');
    await refundBookingManually(bookingId, adminId, refundAmount, reason);
  }

  await pool.execute(
    'CALL sp_log_admin_action(?, ?, ?, ?, ?, ?, ?)',
    [
      adminId,
      'force_cancel_booking',
      'booking',
      bookingId,
      JSON.stringify({ status: oldStatus }),
      JSON.stringify({ status: 'cancelled', refund_amount: refundAmount }),
      reason,
    ]
  );
}

export async function getPlatformSettings(): Promise<PlatformSetting[]> {
  const [rows] = await pool.execute(
    'SELECT setting_key, setting_value, value_type, updated_at FROM platform_settings ORDER BY setting_key'
  );
  return rows as PlatformSetting[];
}

export async function updatePlatformSetting(
  key: string,
  value: string,
  adminId: number
): Promise<void> {
  const [currentRows] = await pool.execute(
    'SELECT setting_value FROM platform_settings WHERE setting_key = ?',
    [key]
  );
  const current = (currentRows as any)[0];
  if (!current) throw new Error('Setting not found');

  const oldValue = current.setting_value;

  await pool.execute(
    'UPDATE platform_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
    [value, adminId, key]
  );

  await pool.execute(
    'CALL sp_log_admin_action(?, ?, ?, ?, ?, ?, ?)',
    [
      adminId,
      'update_setting',
      'setting',
      0,
      JSON.stringify({ [key]: oldValue }),
      JSON.stringify({ [key]: value }),
      null,
    ]
  );
}

export async function getAuditLog(
  targetType?: string,
  adminId?: number
): Promise<AuditLogEntry[]> {
  let sql = `
    SELECT 
      aal.id,
      u.full_name AS admin_name,
      aal.action,
      aal.target_type,
      aal.target_id,
      aal.old_value,
      aal.new_value,
      aal.reason,
      aal.created_at
    FROM admin_audit_log aal
    JOIN users u ON aal.admin_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (targetType) {
    sql += ' AND aal.target_type = ?';
    params.push(targetType);
  }
  if (adminId) {
    sql += ' AND aal.admin_id = ?';
    params.push(adminId);
  }

  sql += ' ORDER BY aal.created_at DESC LIMIT 100';

  const [rows] = await pool.execute(sql, params);
  return rows as AuditLogEntry[];
}
