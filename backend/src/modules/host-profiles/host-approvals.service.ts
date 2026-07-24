import pool from '../../db/connection.js';

interface HostApprovalResult {
  user_id: number;
  new_status: string;
  approved_by: number;
}

interface PendingHost {
  user_id: number;
  full_name: string;
  email: string;
  legal_name: string | null;
  document_id: string | null;
  bank_name: string | null;
  created_at: Date;
}

export async function approveHost(
  userId: number,
  action: 'approve' | 'reject',
  adminId: number
): Promise<HostApprovalResult> {
  const [rows] = await pool.execute(
    'CALL sp_approve_host(?, ?, ?)',
    [userId, action, adminId]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function getPendingHosts(): Promise<PendingHost[]> {
  const [rows] = await pool.execute(
    `SELECT 
      hp.user_id,
      u.full_name,
      u.email,
      hp.legal_name,
      hp.document_id,
      hp.bank_name,
      hp.created_at
    FROM host_profiles hp
    JOIN users u ON hp.user_id = u.id
    WHERE hp.approval_status = 'pending_approval'
    ORDER BY hp.created_at ASC`
  );

  return rows as PendingHost[];
}

export async function getAllHosts(): Promise<any[]> {
  const [rows] = await pool.execute(
    `SELECT 
      hp.user_id,
      u.full_name,
      u.email,
      hp.legal_name,
      hp.document_id,
      hp.bank_name,
      hp.custom_commission_rate AS commission_rate,
      hp.approval_status,
      hp.approved_at,
      hp.created_at
    FROM host_profiles hp
    JOIN users u ON hp.user_id = u.id
    ORDER BY hp.created_at DESC`
  );

  return rows as any[];
}
