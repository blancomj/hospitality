-- ============================================
-- Migración 002: Tabla host_profiles
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS host_profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  legal_name VARCHAR(200),
  document_id VARCHAR(50),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_account_type ENUM('savings', 'checking'),
  custom_commission_rate DECIMAL(5,2) NULL DEFAULT 15.00,
  approval_status ENUM('pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval',
  approved_by BIGINT UNSIGNED,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Índice para buscar propietarios pendientes de aprobación
CREATE INDEX IF NOT EXISTS idx_host_profiles_status ON host_profiles(approval_status);
