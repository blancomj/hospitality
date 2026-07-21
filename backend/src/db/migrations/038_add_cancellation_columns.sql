-- Add cancellation tracking columns to bookings
ALTER TABLE bookings
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER status,
  ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER cancellation_reason,
  ADD COLUMN cancelled_at TIMESTAMP NULL AFTER cancelled_by;

-- Add index for cancellation queries
ALTER TABLE bookings
  ADD INDEX idx_cancelled_by (cancelled_by);
