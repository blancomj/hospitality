-- ============================================
-- Migración 041: Corregir columnas faltantes en host_profiles
-- CONSTRUESCALA Hospitality
-- Compatible con MariaDB
-- ============================================

ALTER TABLE host_profiles
  ADD COLUMN IF NOT EXISTS legal_name VARCHAR(200) AFTER user_id,
  ADD COLUMN IF NOT EXISTS document_id VARCHAR(50) AFTER legal_name,
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) AFTER document_id,
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) AFTER bank_name,
  ADD COLUMN IF NOT EXISTS bank_account_type ENUM('savings', 'checking') AFTER bank_account_number,
  ADD COLUMN IF NOT EXISTS custom_commission_rate DECIMAL(5,2) NULL DEFAULT 15.00 AFTER bank_account_type,
  ADD COLUMN IF NOT EXISTS approval_status ENUM('pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval' AFTER custom_commission_rate,
  ADD COLUMN IF NOT EXISTS approved_by BIGINT UNSIGNED AFTER approval_status,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER approved_at;
