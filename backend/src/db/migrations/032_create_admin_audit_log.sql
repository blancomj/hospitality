-- ============================================
-- Migración 032: Tabla admin_audit_log
-- CONSTRUESCALA Hospitality
-- CU-58: Auditoría de acciones administrativas
-- ============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  old_value JSON,
  new_value JSON,
  reason VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_target (target_type, target_id),
  INDEX idx_admin (admin_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;
