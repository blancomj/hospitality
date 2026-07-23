-- ============================================
-- Migración 046: Alineación completa DB ↔ Código
-- CONSTRUESCALA Hospitality
-- Compatible con MariaDB
-- Ejecutar cada bloque por separado en phpMyAdmin
-- ============================================


-- =============================================
-- 1. TABLA reviews (no existía)
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  host_reply TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reviews_booking (booking_id),
  KEY idx_reviews_property (property_id),
  KEY idx_reviews_guest (guest_id),
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_guest FOREIGN KEY (guest_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- 2. TABLA email_logs (no existía)
-- =============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  booking_id BIGINT UNSIGNED NULL,
  brevo_message_id VARCHAR(100) NULL,
  template_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_logs_user (user_id),
  KEY idx_email_logs_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- 3. TABLA exchange_rates (no existía)
-- =============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code VARCHAR(3) NOT NULL,
  rate_to_cop DECIMAL(15,6) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (currency_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================
-- 4. Agregar columnas faltantes a properties
-- =============================================
ALTER TABLE properties
  ADD COLUMN neighborhood VARCHAR(100) NULL AFTER city,
  ADD COLUMN show_exact_location BOOLEAN NOT NULL DEFAULT FALSE AFTER longitude,
  ADD COLUMN directions_note TEXT NULL AFTER show_exact_location,
  ADD COLUMN area_note TEXT NULL AFTER directions_note,
  ADD COLUMN beds SMALLINT UNSIGNED NULL AFTER bedrooms,
  ADD COLUMN area_m2 SMALLINT UNSIGNED NULL AFTER bathrooms,
  ADD COLUMN ical_export_token VARCHAR(64) NULL UNIQUE AFTER status;


-- =============================================
-- 5. Agregar columnas faltantes a property_photos
-- =============================================
ALTER TABLE property_photos
  ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER image_url,
  ADD COLUMN sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER is_primary;


-- =============================================
-- 6. Agregar columnas faltantes a property_videos
-- =============================================
ALTER TABLE property_videos
  ADD COLUMN source VARCHAR(50) NULL AFTER property_id,
  ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER video_url;


-- =============================================
-- 7. Agregar columnas faltantes a amenity_catalog
-- =============================================
ALTER TABLE amenity_catalog
  ADD COLUMN category VARCHAR(50) NULL AFTER icon,
  ADD COLUMN allows_detail BOOLEAN NOT NULL DEFAULT FALSE AFTER category,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER allows_detail,
  ADD COLUMN sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active;


-- =============================================
-- 8. Agregar columnas faltantes a property_amenities
-- =============================================
ALTER TABLE property_amenities
  ADD COLUMN detail VARCHAR(255) NULL AFTER amenity_id;


-- =============================================
-- 9. Agregar columnas faltantes a property_translations
-- =============================================
ALTER TABLE property_translations
  ADD COLUMN is_auto_translated BOOLEAN NOT NULL DEFAULT FALSE AFTER description;


-- =============================================
-- 10. Corregir ENUMs
-- =============================================
ALTER TABLE properties
  MODIFY COLUMN status ENUM('draft','published','paused','archived') NOT NULL DEFAULT 'draft';

ALTER TABLE payments
  MODIFY COLUMN status ENUM('pending','approved','declined','refunded','failed') NOT NULL DEFAULT 'pending';

ALTER TABLE payouts
  MODIFY COLUMN status ENUM('pending','processing','paid','completed','failed') NOT NULL DEFAULT 'pending';


-- =============================================
-- 11. Recrear v_search_properties
-- =============================================
DROP VIEW IF EXISTS v_search_properties;

CREATE VIEW v_search_properties AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.property_type,
  p.city,
  p.country,
  p.address,
  p.latitude,
  p.longitude,
  p.max_guests,
  p.bedrooms,
  p.bathrooms,
  p.base_price_per_night,
  p.cancellation_policy,
  p.status,
  p.created_at,
  p.updated_at,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT image_url FROM property_photos pp WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
  (SELECT image_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
WHERE p.status = 'published';


-- =============================================
-- 12. Recrear v_bookings_detail
-- =============================================
DROP VIEW IF EXISTS v_bookings_detail;

CREATE VIEW v_bookings_detail AS
SELECT
  b.id,
  b.property_id,
  b.guest_id,
  b.start_date,
  b.end_date,
  b.guests_count,
  b.price_per_night,
  b.total_amount,
  b.status,
  b.expires_at,
  b.cancellation_reason,
  b.cancelled_by,
  b.cancelled_at,
  b.created_at AS booking_created_at,
  b.updated_at AS booking_updated_at,
  p.title AS property_title,
  p.city AS property_city,
  p.neighborhood AS property_neighborhood,
  p.property_type,
  p.max_guests AS property_max_guests,
  p.bedrooms AS property_bedrooms,
  p.host_id AS property_host_id,
  u.full_name AS guest_name,
  u.email AS guest_email,
  u.phone AS guest_phone,
  u.avatar_url AS guest_avatar,
  hu.full_name AS host_name,
  hu.email AS host_email,
  DATEDIFF(b.end_date, b.start_date) AS total_nights,
  CASE WHEN b.status = 'completed' THEN TRUE ELSE FALSE END AS is_completed,
  CASE WHEN b.status IN ('confirmed', 'pending_payment') AND b.start_date > CURDATE() THEN TRUE ELSE FALSE END AS can_be_cancelled
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.guest_id = u.id
JOIN users hu ON p.host_id = hu.id;


-- =============================================
-- 13. Recrear v_host_dashboard
-- =============================================
DROP VIEW IF EXISTS v_host_dashboard;

CREATE VIEW v_host_dashboard AS
SELECT
  h.id AS host_id,
  (SELECT COUNT(*) FROM properties WHERE host_id = h.id AND status = 'published') AS active_properties,
  (SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.host_id = h.id AND MONTH(b.start_date) = MONTH(CURDATE()) AND YEAR(b.start_date) = YEAR(CURDATE())) AS bookings_this_month,
  (SELECT COALESCE(SUM(py.gross_amount), 0) FROM payouts py WHERE py.host_id = h.id AND MONTH(py.created_at) = MONTH(CURDATE()) AND YEAR(py.created_at) = YEAR(CURDATE())) AS income_this_month,
  (SELECT COALESCE(SUM(py.gross_amount), 0) FROM payouts py WHERE py.host_id = h.id) AS income_total,
  (SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.host_id = h.id AND b.status = 'confirmed' AND b.start_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS upcoming_checkins,
  (SELECT COUNT(*) FROM bookings b JOIN properties p ON b.property_id = p.id WHERE p.host_id = h.id AND b.status = 'confirmed' AND b.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS upcoming_checkouts,
  (SELECT COUNT(*) FROM payouts py WHERE py.host_id = h.id AND py.status = 'pending') AS pending_payouts,
  (SELECT COALESCE(SUM(py.net_amount), 0) FROM payouts py WHERE py.host_id = h.id AND py.status = 'pending') AS pending_payout_amount,
  (SELECT COUNT(*) FROM reviews r JOIN properties p ON r.property_id = p.id WHERE p.host_id = h.id AND r.host_reply IS NULL) AS unanswered_reviews
FROM users h
WHERE h.role = 'host';


-- =============================================
-- 14. Recrear v_commission_report
-- =============================================
DROP VIEW IF EXISTS v_commission_report;

CREATE VIEW v_commission_report AS
SELECT
  py.id AS payout_id,
  py.booking_id,
  p.title AS property_title,
  p.city AS property_city,
  hu.full_name AS host_name,
  hu.email AS host_email,
  py.gross_amount,
  py.commission_amount,
  py.net_amount,
  hp.commission_rate,
  py.status AS payout_status,
  b.start_date AS check_in,
  b.end_date AS check_out,
  b.status AS booking_status,
  py.created_at AS payout_created_at,
  py.paid_at
FROM payouts py
JOIN bookings b ON py.booking_id = b.id
JOIN properties p ON b.property_id = p.id
JOIN users hu ON py.host_id = hu.id
LEFT JOIN host_profiles hp ON hu.id = hp.user_id;
