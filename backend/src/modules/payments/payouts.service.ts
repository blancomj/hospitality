import pool from '../../db/connection.js';

interface PayoutBatchItem {
  payout_id: number;
  host_id: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  host_name: string;
  host_email: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_type: string;
}

interface HostPayoutHistory {
  payout_id: number;
  booking_id: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  wompi_payout_reference: string | null;
  paid_at: Date | null;
  property_title: string;
  property_city: string;
  check_in: string;
  check_out: string;
  created_at: Date;
}

interface CommissionReportRow {
  payout_id: number;
  booking_id: number;
  property_title: string;
  property_city: string;
  host_name: string;
  host_email: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  commission_rate: number;
  payout_status: string;
  check_in: string;
  check_out: string;
  booking_status: string;
  payout_created_at: Date;
  paid_at: Date | null;
}

export async function runPayouts(): Promise<PayoutBatchItem[]> {
  const [rows] = await pool.execute('CALL sp_run_payouts()');
  const result = (rows as any)[0];
  return result;
}

export async function markPayoutPaid(
  payoutId: number,
  wompiReference: string
): Promise<void> {
  await pool.execute(
    `UPDATE payouts 
     SET status = 'paid', 
         wompi_payout_reference = ?,
         paid_at = NOW() 
     WHERE id = ?`,
    [wompiReference, payoutId]
  );
}

export async function markPayoutFailed(
  payoutId: number,
  reason: string
): Promise<void> {
  await pool.execute(
    `UPDATE payouts 
     SET status = 'failed',
         wompi_payout_reference = ?
     WHERE id = ?`,
    [reason, payoutId]
  );
}

export async function getHostPayoutHistory(
  hostId: number
): Promise<HostPayoutHistory[]> {
  const [rows] = await pool.execute(
    `SELECT 
      p.id AS payout_id,
      p.booking_id,
      p.gross_amount,
      p.commission_amount,
      p.net_amount,
      p.status,
      p.wompi_payout_reference,
      p.paid_at,
      pr.title AS property_title,
      pr.city AS property_city,
      b.start_date AS check_in,
      b.end_date AS check_out,
      p.created_at
    FROM payouts p
    JOIN bookings b ON p.booking_id = b.id
    JOIN properties pr ON b.property_id = pr.id
    WHERE p.host_id = ?
    ORDER BY p.created_at DESC`,
    [hostId]
  );

  return rows as HostPayoutHistory[];
}

export async function getPendingPayouts(): Promise<any[]> {
  const [rows] = await pool.execute(
    `SELECT 
      p.id AS payout_id,
      p.host_id,
      p.gross_amount,
      p.commission_amount,
      p.net_amount,
      p.status,
      u.full_name AS host_name,
      u.email AS host_email,
      pr.title AS property_title,
      pr.city AS property_city,
      b.start_date AS check_in,
      b.end_date AS check_out,
      p.created_at
    FROM payouts p
    JOIN bookings b ON p.booking_id = b.id
    JOIN properties pr ON b.property_id = pr.id
    JOIN users u ON p.host_id = u.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at ASC`
  );

  return rows as any[];
}

export async function getCommissionReport(
  fromDate: string,
  toDate: string
): Promise<CommissionReportRow[]> {
  const [rows] = await pool.execute(
    `SELECT * FROM v_commission_report
     WHERE payout_created_at BETWEEN ? AND ?
     ORDER BY payout_created_at DESC`,
    [fromDate, toDate]
  );

  return rows as CommissionReportRow[];
}
