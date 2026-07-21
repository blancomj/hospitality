-- ============================================
-- Migración 014: Tabla bookings
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_per_night DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending_payment', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMP NULL,
  cancellation_reason TEXT NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT,
  FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property_dates (property_id, start_date, end_date),
  INDEX idx_status_expires (status, expires_at),
  INDEX idx_guest (guest_id),
  CHECK (end_date > start_date)
) ENGINE=InnoDB;
