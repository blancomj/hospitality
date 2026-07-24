-- Add cancellation tracking columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(500) NULL AFTER status,
  ADD COLUMN IF NOT EXISTS cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER cancelled_by;

-- ADD INDEX IF NOT EXISTS for cancellation queries
ALTER TABLE bookings
  ADD INDEX IF NOT EXISTS idx_cancelled_by (cancelled_by);
