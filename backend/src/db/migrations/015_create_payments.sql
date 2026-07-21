-- ============================================
-- Migración 015: Tabla payments
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  wompi_transaction_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'approved', 'declined', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30),
  raw_webhook_payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  INDEX idx_booking (booking_id),
  INDEX idx_wompi_transaction (wompi_transaction_id)
) ENGINE=InnoDB;
