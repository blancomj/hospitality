-- ============================================================================
-- CONSOLIDATED DDL — CONSTRUESCALA Hospitality
-- Generated from migrations 001–052 (latest version of each object)
-- ============================================================================


-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- users (001 + 040 firebase_uid)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  firebase_uid VARCHAR(64) UNIQUE,
  google_id VARCHAR(64) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  avatar_url VARCHAR(500),
  role ENUM('guest', 'host', 'admin') NOT NULL DEFAULT 'guest',
  phone VARCHAR(20),
  locale VARCHAR(5) NOT NULL DEFAULT 'es',
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  id_verified BOOLEAN NOT NULL DEFAULT FALSE,
  fast_response BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);


-- ─────────────────────────────────────────────────────────────────────────────
-- host_profiles (002)
-- ─────────────────────────────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_host_profiles_status ON host_profiles(approval_status);


-- ─────────────────────────────────────────────────────────────────────────────
-- properties (004 + 046 additional columns + 046 status ENUM)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  host_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  property_type ENUM('apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion') NOT NULL DEFAULT 'apartamento',
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Colombia',
  neighborhood VARCHAR(100),
  address VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  show_exact_location BOOLEAN NOT NULL DEFAULT FALSE,
  directions_note TEXT,
  area_note TEXT,
  max_guests SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  bedrooms SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  beds SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  area_m2 SMALLINT UNSIGNED NULL,
  base_price_per_night DECIMAL(10,2) NOT NULL,
  cancellation_policy ENUM('flexible', 'moderada', 'estricta') NOT NULL DEFAULT 'moderada',
  status ENUM('draft', 'published', 'paused', 'archived') NOT NULL DEFAULT 'draft',
  ical_export_token VARCHAR(64) UNIQUE,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count SMALLINT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city_status (city, status),
  INDEX idx_host_id (host_id),
  INDEX idx_status (status),
  INDEX idx_properties_type (property_type)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- amenity_catalog (005)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amenity_catalog (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category ENUM('basicos','cocina','lavanderia','espacios','edificio','familia','seguridad','accesibilidad','politicas') NOT NULL,
  name VARCHAR(80) NOT NULL,
  icon VARCHAR(40) NOT NULL,
  allows_detail BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_category_name (category, name)
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_amenity_category ON amenity_catalog(category);
CREATE INDEX IF NOT EXISTS idx_amenity_active ON amenity_catalog(is_active);


-- ─────────────────────────────────────────────────────────────────────────────
-- property_amenities (006)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_amenities (
  property_id BIGINT UNSIGNED NOT NULL,
  amenity_id SMALLINT UNSIGNED NOT NULL,
  detail VARCHAR(120) NULL,
  PRIMARY KEY (property_id, amenity_id),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (amenity_id) REFERENCES amenity_catalog(id) ON DELETE RESTRICT
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- property_photos (007)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  thumbnail_url VARCHAR(500),
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_photos (property_id, sort_order)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- property_videos (008 + 046 source column)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_videos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  source VARCHAR(50) NULL,
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  duration_seconds SMALLINT UNSIGNED NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_videos (property_id, sort_order)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- property_translations (009)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_translations (
  property_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(5) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  is_auto_translated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, locale),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- availability_overrides (010)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_overrides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  special_price DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_property_date (property_id, date),
  INDEX idx_property_date (property_id, date)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- bookings (014 + 051 status ENUM)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_per_night DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending_payment', 'confirmed', 'cancelled', 'completed', 'expired', 'refunded') NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMP NULL,
  cancellation_reason VARCHAR(500) NULL,
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
  INDEX idx_cancelled_by (cancelled_by),
  CHECK (end_date > start_date)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- payments (015 + 051 reference/refunded_amount/updated_at + status ENUM)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(60) NULL,
  wompi_transaction_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'declined', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(30),
  raw_webhook_payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  INDEX idx_booking (booking_id),
  INDEX idx_wompi_transaction (wompi_transaction_id),
  UNIQUE KEY uq_payments_reference (reference)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- payouts (016 + 046 status ENUM)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  host_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'paid', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  wompi_payout_reference VARCHAR(100),
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_status (status),
  INDEX idx_host (host_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- reviews (046)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- email_logs (046)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- exchange_rates (046)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  currency_code VARCHAR(3) NOT NULL,
  rate_to_cop DECIMAL(15,6) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (currency_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- platform_settings (052 final schema)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name VARCHAR(100) NOT NULL,
  value_text TEXT NULL,
  value_number DECIMAL(10,2) NULL,
  value_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_platform_settings_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- admin_audit_log (032)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- ical_links (036)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ical_links (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id BIGINT UNSIGNED NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  ical_url VARCHAR(2000) NOT NULL,
  last_synced_at TIMESTAMP NULL,
  sync_status ENUM('pending', 'synced', 'error') NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property (property_id)
) ENGINE=InnoDB;


-- ─────────────────────────────────────────────────────────────────────────────
-- user_favorites (039)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_favorites (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_property (user_id, property_id),
  KEY idx_user_id (user_id),
  KEY idx_property_id (property_id),
  CONSTRAINT fk_uf_user    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_uf_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────────────────────
-- refund_requests (051/052)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  requested_by BIGINT UNSIGNED NOT NULL,
  requested_amount DECIMAL(10,2) NOT NULL,
  refund_percentage DECIMAL(5,2) NOT NULL,
  policy_applied VARCHAR(20) NOT NULL,
  days_until_checkin INT NOT NULL,
  reason VARCHAR(500) NULL,
  status ENUM('pending','processing','approved','rejected','failed')
    NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  review_notes VARCHAR(500) NULL,
  wompi_refund_id VARCHAR(100) NULL,
  failure_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking (booking_id),
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB;


-- ============================================================================
-- 2. VIEWS
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- v_search_properties (052 — final)
-- ─────────────────────────────────────────────────────────────────────────────
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
  (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1) AS main_photo_url,
  (SELECT pp.image_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) AS main_thumbnail_url
FROM properties p
JOIN users u ON p.host_id = u.id
WHERE p.status = 'published';


-- ─────────────────────────────────────────────────────────────────────────────
-- v_property_detail (049 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_property_detail;

CREATE VIEW v_property_detail AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.city,
  p.country,
  p.neighborhood,
  p.address,
  p.latitude,
  p.longitude,
  p.show_exact_location,
  p.directions_note,
  p.area_note,
  p.property_type,
  p.max_guests,
  p.bedrooms,
  p.beds,
  p.bathrooms,
  p.area_m2,
  p.base_price_per_night,
  p.cancellation_policy,
  p.status,
  p.ical_export_token,
  p.created_at,
  p.updated_at,
  u.full_name AS host_name,
  u.avatar_url AS host_avatar,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pp.id,
      'url', pp.image_url,
      'thumbnail_url', COALESCE(pp.thumbnail_url, pp.image_url),
      'is_primary', pp.is_primary,
      'sort_order', pp.sort_order
    )
    ORDER BY pp.is_primary DESC, pp.sort_order ASC, pp.id ASC
  ) FROM property_photos pp WHERE pp.property_id = p.id) AS photos,
  (SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'id', pv.id,
      'source', COALESCE(pv.source, 'upload'),
      'url', pv.video_url,
      'thumbnail_url', pv.thumbnail_url
    )
  ) FROM property_videos pv WHERE pv.property_id = p.id) AS videos,
  (SELECT COUNT(*) FROM property_photos pp2 WHERE pp2.property_id = p.id) AS photo_count
FROM properties p
JOIN users u ON p.host_id = u.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- v_bookings_detail (051 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_bookings_detail;

CREATE VIEW v_bookings_detail AS
SELECT
  b.id AS booking_id,
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
  p.property_type AS property_type,
  p.max_guests AS property_max_guests,
  p.bedrooms AS property_bedrooms,
  p.host_id AS property_host_id,
  p.cancellation_policy AS property_cancellation_policy,

  u.full_name AS guest_name,
  u.email AS guest_email,
  u.phone AS guest_phone,
  u.avatar_url AS guest_avatar,

  hu.full_name AS host_name,
  hu.email AS host_email,
  hu.phone AS host_phone,

  pay.status AS payment_status,
  pay.reference AS payment_reference,
  pay.refunded_amount AS refunded_amount,

  rr.id AS refund_request_id,
  rr.status AS refund_request_status,
  rr.requested_amount AS refund_requested_amount,

  DATEDIFF(b.end_date, b.start_date) AS total_nights,

  (b.status = 'confirmed' AND b.end_date <= CURDATE()) AS is_completed,
  (b.status IN ('pending_payment', 'confirmed') AND b.start_date > CURDATE()) AS can_be_cancelled,
  (b.status = 'pending_payment' AND b.expires_at > NOW()) AS can_be_paid

FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.guest_id = u.id
JOIN users hu ON p.host_id = hu.id
LEFT JOIN (
  SELECT p1.id, p1.booking_id, p1.status, p1.reference, p1.refunded_amount
  FROM payments p1
  JOIN (
    SELECT booking_id, MAX(id) AS id FROM payments GROUP BY booking_id
  ) last_pay ON last_pay.id = p1.id
) pay ON pay.booking_id = b.id
LEFT JOIN (
  SELECT r1.id, r1.booking_id, r1.status, r1.requested_amount
  FROM refund_requests r1
  JOIN (
    SELECT booking_id, MAX(id) AS id FROM refund_requests GROUP BY booking_id
  ) last_rr ON last_rr.id = r1.id
) rr ON rr.booking_id = b.id;


-- ─────────────────────────────────────────────────────────────────────────────
-- v_host_dashboard (046 — final)
-- ─────────────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────────────
-- v_commission_report (046 — final)
-- ─────────────────────────────────────────────────────────────────────────────
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
  hp.custom_commission_rate AS commission_rate,
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


-- ─────────────────────────────────────────────────────────────────────────────
-- v_admin_kpis (034)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_admin_kpis;

CREATE VIEW v_admin_kpis AS
SELECT
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) AS confirmed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END) AS cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END), 0) AS gmv,
  COALESCE(SUM(CASE WHEN py.status IN ('paid', 'processing') THEN py.commission_amount ELSE 0 END), 0) AS commissions_generated,
  COUNT(DISTINCT CASE WHEN py.status = 'pending' THEN py.id END) AS pending_payouts,
  COALESCE(SUM(CASE WHEN py.status = 'pending' THEN py.net_amount ELSE 0 END), 0) AS pending_payout_amount,
  COUNT(DISTINCT CASE WHEN py.status = 'paid' THEN py.id END) AS paid_payouts,
  COALESCE(SUM(CASE WHEN py.status = 'paid' THEN py.net_amount ELSE 0 END), 0) AS paid_payout_amount,
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT CASE WHEN u.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN u.id END) AS new_users_30d,
  COUNT(DISTINCT CASE WHEN u.role = 'host' THEN u.id END) AS total_hosts,
  COUNT(DISTINCT CASE WHEN hp.approval_status = 'pending_approval' THEN hp.user_id END) AS pending_host_approvals,
  COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) AS active_properties
FROM bookings b
LEFT JOIN payouts py ON b.id = py.booking_id
CROSS JOIN users u
LEFT JOIN host_profiles hp ON u.id = hp.user_id
LEFT JOIN properties p ON 1=1;


-- ─────────────────────────────────────────────────────────────────────────────
-- v_refund_queue (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_refund_queue;

CREATE VIEW v_refund_queue AS
SELECT
  rr.id AS refund_request_id,
  rr.booking_id,
  rr.status,
  rr.requested_amount,
  rr.refund_percentage,
  rr.policy_applied,
  rr.days_until_checkin,
  rr.reason,
  rr.review_notes,
  rr.failure_reason,
  rr.wompi_refund_id,
  rr.created_at,
  rr.reviewed_at,

  b.start_date,
  b.end_date,
  b.total_amount AS booking_total,

  p.title AS property_title,
  p.city AS property_city,

  guest.full_name AS guest_name,
  guest.email AS guest_email,

  requester.full_name AS requested_by_name,
  reviewer.full_name AS reviewed_by_name,

  pay.wompi_transaction_id

FROM refund_requests rr
JOIN bookings b ON rr.booking_id = b.id
JOIN properties p ON b.property_id = p.id
JOIN users guest ON b.guest_id = guest.id
JOIN users requester ON rr.requested_by = requester.id
LEFT JOIN users reviewer ON rr.reviewed_by = reviewer.id
JOIN payments pay ON rr.payment_id = pay.id;


-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS fn_setting_int;
DROP FUNCTION IF EXISTS fn_setting_decimal;

DELIMITER //

CREATE FUNCTION fn_setting_int(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value INT;

  SELECT ROUND(value_number) INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

CREATE FUNCTION fn_setting_decimal(
  p_key VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  p_default DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_value DECIMAL(10,2);

  SELECT value_number INTO v_value
  FROM platform_settings
  WHERE key_name = p_key AND value_number IS NOT NULL
  LIMIT 1;

  RETURN COALESCE(v_value, p_default);
END //

DELIMITER ;


-- ============================================================================
-- 4. STORED PROCEDURES
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- sp_upsert_google_user (003)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_upsert_google_user;

DELIMITER //

CREATE PROCEDURE sp_upsert_google_user(
  IN p_google_id VARCHAR(64),
  IN p_email VARCHAR(255),
  IN p_full_name VARCHAR(150),
  IN p_avatar_url VARCHAR(500)
)
BEGIN
  DECLARE v_user_id BIGINT UNSIGNED;

  SELECT id INTO v_user_id
  FROM users
  WHERE google_id = p_google_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE users
      SET google_id = p_google_id,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    INSERT INTO users (google_id, email, full_name, avatar_url, role)
    VALUES (p_google_id, p_email, p_full_name, p_avatar_url, 'guest');

    SET v_user_id = LAST_INSERT_ID();
  ELSE
    UPDATE users
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;

  SELECT
    id,
    google_id,
    email,
    full_name,
    avatar_url,
    role,
    phone,
    locale,
    status,
    id_verified,
    fast_response,
    created_at,
    updated_at
  FROM users
  WHERE id = v_user_id;

END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_upsert_firebase_user (042)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_upsert_firebase_user;

DELIMITER //

CREATE PROCEDURE sp_upsert_firebase_user(
  IN p_firebase_uid VARCHAR(64),
  IN p_email VARCHAR(255),
  IN p_full_name VARCHAR(150),
  IN p_avatar_url VARCHAR(500)
)
BEGIN
  DECLARE v_user_id BIGINT UNSIGNED;

  SELECT id INTO v_user_id
  FROM users
  WHERE firebase_uid = p_firebase_uid
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE users
      SET firebase_uid = p_firebase_uid,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    INSERT INTO users (firebase_uid, email, full_name, avatar_url, role)
    VALUES (p_firebase_uid, p_email, p_full_name, p_avatar_url, 'guest');
    SET v_user_id = LAST_INSERT_ID();
  ELSE
    UPDATE users
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;

  SELECT id, firebase_uid, google_id, email, full_name, avatar_url,
         role, phone, locale, status, id_verified, fast_response,
         created_at, updated_at
  FROM users
  WHERE id = v_user_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_host_calendar (042)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_get_host_calendar;

DELIMITER //

CREATE PROCEDURE sp_get_host_calendar(
  IN p_host_id BIGINT UNSIGNED,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  WITH cal AS (
    SELECT DATE_ADD(p_from_date, INTERVAL seq DAY) AS dt
    FROM (
      SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
      UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
      UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19
      UNION SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24
      UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
    ) dates
    WHERE DATE_ADD(p_from_date, INTERVAL seq DAY) <= p_to_date
  )
  SELECT
    p.id AS property_id,
    p.title AS property_title,
    cal.dt AS `date`,
    CASE
      WHEN b.id IS NOT NULL THEN b.status
      WHEN ao.is_blocked = 1 THEN 'blocked'
      ELSE 'available'
    END AS status,
    b.id AS booking_id,
    u.full_name AS guest_name,
    COALESCE(ao.is_blocked, 0) AS is_blocked,
    ao.special_price
  FROM properties p
  CROSS JOIN cal
  LEFT JOIN bookings b ON p.id = b.property_id
    AND b.start_date <= cal.dt
    AND b.end_date > cal.dt
    AND b.status IN ('confirmed', 'completed')
  LEFT JOIN users u ON b.guest_id = u.id
  LEFT JOIN availability_overrides ao ON p.id = ao.property_id AND ao.date = cal.dt
  WHERE p.host_id = p_host_id
  ORDER BY p.id, cal.dt;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_search_properties (042)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_search_properties;

DELIMITER //

CREATE PROCEDURE sp_search_properties(
  IN p_city VARCHAR(100),
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_guests INT,
  IN p_min_price DECIMAL(10,2),
  IN p_max_price DECIMAL(10,2),
  IN p_type VARCHAR(50),
  IN p_amenities VARCHAR(500)
)
BEGIN
  SELECT
    vsp.*,
    (SELECT COUNT(*) FROM availability_overrides ao
     WHERE ao.property_id = vsp.id AND ao.is_blocked = TRUE
     AND ao.date BETWEEN COALESCE(p_start_date, '2000-01-01') AND COALESCE(p_end_date, '2099-12-31')
    ) AS blocked_dates_count
  FROM v_search_properties vsp
  WHERE vsp.status = 'published'
    AND (p_city IS NULL OR vsp.city = p_city)
    AND (p_guests IS NULL OR vsp.max_guests >= p_guests)
    AND (p_min_price IS NULL OR vsp.base_price_per_night >= p_min_price)
    AND (p_max_price IS NULL OR vsp.base_price_per_night <= p_max_price)
    AND (p_type IS NULL OR vsp.property_type = p_type)
    AND (p_start_date IS NULL OR p_end_date IS NULL
         OR vsp.id NOT IN (
           SELECT property_id FROM bookings
           WHERE status IN ('confirmed', 'pending_payment')
           AND start_date < p_end_date AND end_date > p_start_date
         ))
    AND (p_amenities IS NULL OR LENGTH(p_amenities) = 0
         OR vsp.id IN (
           SELECT property_id FROM property_amenities
           WHERE FIND_IN_SET(amenity_id, p_amenities) > 0
           GROUP BY property_id
           HAVING COUNT(DISTINCT amenity_id) = LENGTH(p_amenities) - LENGTH(REPLACE(p_amenities, ',', '')) + 1
         ))
  ORDER BY vsp.base_price_per_night ASC;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_my_properties (042)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_get_my_properties;

DELIMITER //

CREATE PROCEDURE sp_get_my_properties(
  IN p_host_id BIGINT UNSIGNED
)
BEGIN
  SELECT p.*,
    (SELECT image_url FROM property_photos pp
     WHERE pp.property_id = p.id AND pp.is_primary = 1 LIMIT 1
    ) AS main_photo_url
  FROM properties p
  WHERE p.host_id = p_host_id
  ORDER BY p.created_at DESC;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_host_bookings (042)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_get_host_bookings;

DELIMITER //

CREATE PROCEDURE sp_get_host_bookings(
  IN p_host_id BIGINT UNSIGNED,
  IN p_status VARCHAR(30)
)
BEGIN
  SELECT
    b.id AS booking_id,
    b.property_id,
    p.title AS property_title,
    p.city AS property_city,
    u.full_name AS guest_name,
    u.email AS guest_email,
    u.phone AS guest_phone,
    b.start_date,
    b.end_date,
    b.guests_count,
    b.total_amount,
    b.status,
    b.created_at
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN users u ON b.guest_id = u.id
  WHERE p.host_id = p_host_id
    AND (p_status IS NULL OR LENGTH(p_status) = 0 OR b.status = p_status)
  ORDER BY b.start_date DESC;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_get_host_finances (047 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_get_host_finances;

DELIMITER //

CREATE PROCEDURE sp_get_host_finances(
  IN p_host_id BIGINT UNSIGNED,
  IN p_from_date DATE,
  IN p_to_date DATE
)
BEGIN
  SELECT
    py.id AS payout_id,
    py.booking_id,
    p.title AS property_title,
    p.city AS property_city,
    b.start_date AS check_in,
    b.end_date AS check_out,
    py.gross_amount,
    py.commission_amount,
    py.net_amount,
    py.status,
    py.created_at
  FROM payouts py
  JOIN bookings b ON py.booking_id = b.id
  JOIN properties p ON b.property_id = p.id
  WHERE py.host_id = p_host_id
    AND (p_from_date IS NULL OR py.created_at >= p_from_date)
    AND (p_to_date IS NULL OR py.created_at <= CONCAT(p_to_date, ' 23:59:59'))
  ORDER BY py.created_at DESC;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_booking (048 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_create_booking;

DELIMITER //

CREATE PROCEDURE sp_create_booking(
  IN p_property_id BIGINT UNSIGNED,
  IN p_guest_id BIGINT UNSIGNED,
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_guests_count SMALLINT UNSIGNED
)
BEGIN
  DECLARE v_price_per_night DECIMAL(10,2);
  DECLARE v_total_nights INT;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_price_adjustment DECIMAL(10,2);
  DECLARE v_overlapping_count INT;
  DECLARE v_blocked_count INT;
  DECLARE v_max_guests INT;
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_expires_at TIMESTAMP;
  DECLARE v_expiry_minutes INT;
  DECLARE v_min_nights INT;
  DECLARE v_max_nights INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  SET v_expiry_minutes = fn_setting_int('booking_expiry_minutes', 15);
  SET v_min_nights     = fn_setting_int('min_booking_nights', 1);
  SET v_max_nights     = fn_setting_int('max_booking_nights', 365);

  START TRANSACTION;

  SELECT base_price_per_night, max_guests INTO v_price_per_night, v_max_guests
  FROM properties
  WHERE id = p_property_id AND status = 'published'
  FOR UPDATE;

  IF v_price_per_night IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Property not found or not published';
  END IF;

  IF p_guests_count > v_max_guests THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Guest count exceeds property maximum';
  END IF;

  IF p_end_date <= p_start_date THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'End date must be after start date';
  END IF;

  IF p_start_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Start date cannot be in the past';
  END IF;

  SET v_total_nights = DATEDIFF(p_end_date, p_start_date);

  IF v_total_nights < v_min_nights THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stay is shorter than the minimum allowed';
  END IF;

  IF v_total_nights > v_max_nights THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Stay exceeds the maximum allowed';
  END IF;

  SELECT COUNT(*) INTO v_overlapping_count
  FROM bookings
  WHERE property_id = p_property_id
    AND status IN ('confirmed', 'pending_payment')
    AND start_date < p_end_date
    AND end_date > p_start_date
  FOR UPDATE;

  IF v_overlapping_count > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Property is not available for the selected dates';
  END IF;

  SELECT COUNT(*) INTO v_blocked_count
  FROM availability_overrides
  WHERE property_id = p_property_id
    AND is_blocked = TRUE
    AND date >= p_start_date
    AND date < p_end_date;

  IF v_blocked_count > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Some dates are blocked by the host';
  END IF;

  SELECT COALESCE(SUM(special_price - v_price_per_night), 0)
    INTO v_price_adjustment
  FROM availability_overrides
  WHERE property_id = p_property_id
    AND special_price IS NOT NULL
    AND date >= p_start_date
    AND date < p_end_date;

  SET v_total_amount = (v_price_per_night * v_total_nights) + v_price_adjustment;

  IF v_total_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Computed total amount is invalid';
  END IF;

  SET v_expires_at = DATE_ADD(NOW(), INTERVAL v_expiry_minutes MINUTE);

  INSERT INTO bookings (
    property_id, guest_id, start_date, end_date, guests_count,
    price_per_night, total_amount, status, expires_at
  ) VALUES (
    p_property_id, p_guest_id, p_start_date, p_end_date, p_guests_count,
    v_price_per_night, v_total_amount, 'pending_payment', v_expires_at
  );

  SET v_booking_id = LAST_INSERT_ID();

  COMMIT;

  SELECT
    b.id AS booking_id,
    b.property_id,
    b.start_date,
    b.end_date,
    b.guests_count,
    b.price_per_night,
    b.total_amount,
    b.status,
    b.expires_at,
    v_total_nights AS total_nights
  FROM bookings b
  WHERE b.id = v_booking_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_confirm_payment (048 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_confirm_payment;

DELIMITER //

CREATE PROCEDURE sp_confirm_payment(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_wompi_transaction_id VARCHAR(100),
    IN p_payment_method VARCHAR(30),
    IN p_raw_payload JSON
)
BEGIN
    DECLARE v_payment_id BIGINT UNSIGNED;
    DECLARE v_property_id BIGINT UNSIGNED;
    DECLARE v_host_id BIGINT UNSIGNED;
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_commission_rate DECIMAL(5,2);
    DECLARE v_commission_amount DECIMAL(10,2);
    DECLARE v_net_amount DECIMAL(10,2);
    DECLARE v_booking_status VARCHAR(30);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
      ROLLBACK;
      RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_booking_status
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF v_booking_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La reserva no existe';
    END IF;

    IF v_booking_status <> 'pending_payment' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La reserva no está pendiente de pago';
    END IF;

    SELECT id INTO v_payment_id
    FROM payments
    WHERE booking_id = p_booking_id
      AND status = 'pending'
    LIMIT 1
    FOR UPDATE;

    IF v_payment_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró pago pendiente para esta reserva';
    END IF;

    UPDATE payments
    SET wompi_transaction_id = p_wompi_transaction_id,
        status = 'approved',
        payment_method = p_payment_method,
        raw_webhook_payload = p_raw_payload
    WHERE id = v_payment_id;

    UPDATE bookings
    SET status = 'confirmed'
    WHERE id = p_booking_id;

    SELECT b.property_id, p.host_id, b.total_amount
    INTO v_property_id, v_host_id, v_total_amount
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    WHERE b.id = p_booking_id;

    SELECT COALESCE(
             MAX(hp.custom_commission_rate),
             fn_setting_decimal('default_commission_rate', 15.00)
           )
      INTO v_commission_rate
    FROM host_profiles hp
    WHERE hp.user_id = v_host_id;

    SET v_commission_rate = COALESCE(v_commission_rate,
                                     fn_setting_decimal('default_commission_rate', 15.00));

    SET v_commission_amount = ROUND(v_total_amount * v_commission_rate / 100, 2);
    SET v_net_amount = v_total_amount - v_commission_amount;

    INSERT INTO payouts (booking_id, host_id, gross_amount, commission_amount, net_amount, status, created_at)
    VALUES (p_booking_id, v_host_id, v_total_amount, v_commission_amount, v_net_amount, 'pending', NOW());

    COMMIT;

    SELECT
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        v_total_amount AS total_amount,
        v_commission_rate AS commission_rate,
        v_commission_amount AS commission_amount,
        v_net_amount AS net_amount;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_approve_host (025)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_approve_host;

DELIMITER //

CREATE PROCEDURE sp_approve_host(
    IN p_user_id BIGINT UNSIGNED,
    IN p_action ENUM('approve', 'reject'),
    IN p_admin_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_current_status VARCHAR(20);
    DECLARE v_new_status VARCHAR(20);

    SELECT approval_status INTO v_current_status
    FROM host_profiles
    WHERE user_id = p_user_id;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró perfil de propietario';
    END IF;

    IF v_current_status != 'pending_approval' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El propietario ya fue procesado anteriormente';
    END IF;

    IF p_action = 'approve' THEN
        SET v_new_status = 'approved';
    ELSE
        SET v_new_status = 'rejected';
    END IF;

    UPDATE host_profiles
    SET approval_status = v_new_status,
        approved_by = p_admin_id,
        approved_at = NOW()
    WHERE user_id = p_user_id;

    SELECT
        p_user_id AS user_id,
        v_new_status AS new_status,
        p_admin_id AS approved_by;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_run_payouts (026)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_run_payouts;

DELIMITER //

CREATE PROCEDURE sp_run_payouts()
BEGIN
    DECLARE v_payout_count INT DEFAULT 0;

    UPDATE payouts p
    JOIN bookings b ON p.booking_id = b.id
    SET p.status = 'processing'
    WHERE p.status = 'pending'
      AND b.status = 'confirmed'
      AND b.start_date <= CURDATE();

    SET v_payout_count = ROW_COUNT();

    SELECT
        p.id AS payout_id,
        p.host_id,
        p.gross_amount,
        p.commission_amount,
        p.net_amount,
        u.full_name AS host_name,
        u.email AS host_email,
        hp.bank_name,
        hp.bank_account_number,
        hp.bank_account_type
    FROM payouts p
    JOIN users u ON p.host_id = u.id
    JOIN host_profiles hp ON p.host_id = hp.user_id
    WHERE p.status = 'processing';
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_review (028)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_create_review;

DELIMITER //

CREATE PROCEDURE sp_create_review(
    IN p_booking_id BIGINT UNSIGNED,
    IN p_guest_id BIGINT UNSIGNED,
    IN p_rating TINYINT UNSIGNED,
    IN p_comment TEXT
)
BEGIN
    DECLARE v_property_id BIGINT UNSIGNED;
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_guest_checkin DATE;
    DECLARE v_existing_review BIGINT UNSIGNED;

    SELECT property_id, status, end_date INTO v_property_id, v_booking_status, v_guest_checkin
    FROM bookings
    WHERE id = p_booking_id
      AND guest_id = p_guest_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reserva no encontrada o no pertenece al huésped';
    END IF;

    IF v_booking_status != 'completed' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo se pueden reseñar reservas completadas';
    END IF;

    SELECT id INTO v_existing_review
    FROM reviews
    WHERE booking_id = p_booking_id;

    IF v_existing_review IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ya existe una reseña para esta reserva';
    END IF;

    IF p_rating < 1 OR p_rating > 5 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El rating debe ser entre 1 y 5';
    END IF;

    INSERT INTO reviews (booking_id, property_id, guest_id, rating, comment, created_at)
    VALUES (p_booking_id, v_property_id, p_guest_id, p_rating, p_comment, NOW());

    SELECT
        LAST_INSERT_ID() AS review_id,
        p_booking_id AS booking_id,
        v_property_id AS property_id,
        p_rating AS rating,
        p_comment AS comment;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_reply_review (029)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_reply_review;

DELIMITER //

CREATE PROCEDURE sp_reply_review(
    IN p_review_id BIGINT UNSIGNED,
    IN p_host_id BIGINT UNSIGNED,
    IN p_reply TEXT
)
BEGIN
    DECLARE v_host_owner BIGINT UNSIGNED;

    SELECT pr.host_id INTO v_host_owner
    FROM reviews r
    JOIN properties pr ON r.property_id = pr.id
    WHERE r.id = p_review_id;

    IF v_host_owner IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Reseña no encontrada';
    END IF;

    IF v_host_owner != p_host_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo el propietario de la propiedad puede responder';
    END IF;

    IF EXISTS (SELECT 1 FROM reviews WHERE id = p_review_id AND host_reply IS NOT NULL) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Esta reseña ya tiene una respuesta';
    END IF;

    UPDATE reviews
    SET host_reply = p_reply
    WHERE id = p_review_id;

    SELECT
        p_review_id AS review_id,
        p_reply AS host_reply;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_log_email (030)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_log_email;

DELIMITER //

CREATE PROCEDURE sp_log_email(
    IN p_user_id BIGINT UNSIGNED,
    IN p_booking_id BIGINT UNSIGNED,
    IN p_brevo_message_id VARCHAR(100),
    IN p_template_type VARCHAR(50)
)
BEGIN
    INSERT INTO email_logs (user_id, booking_id, brevo_message_id, template_type, status, created_at)
    VALUES (p_user_id, p_booking_id, p_brevo_message_id, p_template_type, 'sent', NOW());

    SELECT LAST_INSERT_ID() AS log_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_log_admin_action (035)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_log_admin_action;

DELIMITER //

CREATE PROCEDURE sp_log_admin_action(
    IN p_admin_id BIGINT UNSIGNED,
    IN p_action VARCHAR(60),
    IN p_target_type VARCHAR(30),
    IN p_target_id BIGINT UNSIGNED,
    IN p_old_value JSON,
    IN p_new_value JSON,
    IN p_reason VARCHAR(500)
)
BEGIN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, old_value, new_value, reason, created_at)
    VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_old_value, p_new_value, p_reason, NOW());

    SELECT LAST_INSERT_ID() AS log_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_sync_ical_events (036)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_sync_ical_events;

DELIMITER //

CREATE PROCEDURE sp_sync_ical_events(
    IN p_property_id BIGINT UNSIGNED,
    IN p_ical_url VARCHAR(2000),
    IN p_events JSON
)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE v_count INT;
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_uid VARCHAR(200);
    DECLARE v_blocked_count INT DEFAULT 0;

    SET v_count = JSON_LENGTH(p_events);

    WHILE i < v_count DO
        SET v_start_date = STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '].start'))), '%Y-%m-%d');
        SET v_end_date = STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '].end'))), '%Y-%m-%d');
        SET v_uid = JSON_UNQUOTE(JSON_EXTRACT(p_events, CONCAT('$[', i, '].uid')));

        WHILE v_start_date < v_end_date DO
            INSERT INTO availability_overrides (property_id, date, is_blocked, created_at)
            VALUES (p_property_id, v_start_date, 1, NOW())
            ON DUPLICATE KEY UPDATE is_blocked = 1;

            SET v_blocked_count = v_blocked_count + 1;
            SET v_start_date = DATE_ADD(v_start_date, INTERVAL 1 DAY);
        END WHILE;

        SET i = i + 1;
    END WHILE;

    UPDATE ical_links
    SET last_synced_at = NOW(),
        sync_status = 'synced',
        error_message = NULL
    WHERE property_id = p_property_id
      AND ical_url = p_ical_url;

    SELECT v_blocked_count AS blocked_dates;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_create_payment_intent (051 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_create_payment_intent;

DELIMITER //

CREATE PROCEDURE sp_create_payment_intent(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_reference VARCHAR(60);
  DECLARE v_expires_at TIMESTAMP;
  DECLARE v_valid TINYINT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT 1, total_amount, expires_at
    INTO v_valid, v_total_amount, v_expires_at
  FROM bookings
  WHERE id = p_booking_id
    AND guest_id = p_user_id
    AND status = 'pending_payment'
    AND expires_at > NOW()
  FOR UPDATE;

  IF v_valid = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Reserva no encontrada, no está pendiente de pago, o ha expirado';
  END IF;

  SELECT id, reference INTO v_payment_id, v_reference
  FROM payments
  WHERE booking_id = p_booking_id
    AND status = 'pending'
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    SET v_reference = CONCAT('CS-', p_booking_id, '-', UNIX_TIMESTAMP(), '-',
                             LPAD(FLOOR(RAND() * 10000), 4, '0'));

    INSERT INTO payments (booking_id, reference, amount, status, created_at)
    VALUES (p_booking_id, v_reference, v_total_amount, 'pending', NOW());

    SET v_payment_id = LAST_INSERT_ID();
  ELSEIF v_reference IS NULL THEN
    SET v_reference = CONCAT('CS-', p_booking_id, '-', UNIX_TIMESTAMP(), '-',
                             LPAD(FLOOR(RAND() * 10000), 4, '0'));
    UPDATE payments SET reference = v_reference, amount = v_total_amount
    WHERE id = v_payment_id;
  ELSE
    UPDATE payments SET amount = v_total_amount WHERE id = v_payment_id;
  END IF;

  COMMIT;

  SELECT
    v_payment_id AS payment_id,
    p_booking_id AS booking_id,
    v_total_amount AS amount,
    v_reference AS reference,
    'COP' AS currency,
    v_expires_at AS expires_at;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_cancel_booking (051 — final)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_cancel_booking;

DELIMITER //

CREATE PROCEDURE sp_cancel_booking(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED,
  IN p_reason VARCHAR(500)
)
BEGIN
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_guest_id BIGINT UNSIGNED;
  DECLARE v_host_id BIGINT UNSIGNED;
  DECLARE v_start_date DATE;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_cancellation_policy VARCHAR(20);
  DECLARE v_days_until_checkin INT;
  DECLARE v_refund_percentage DECIMAL(5,2);
  DECLARE v_refund_amount DECIMAL(10,2);
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_refund_request_id BIGINT UNSIGNED DEFAULT NULL;
  DECLARE v_refund_status VARCHAR(20) DEFAULT 'none';

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT
    b.status, b.guest_id, b.start_date, b.total_amount,
    p.cancellation_policy, p.host_id
  INTO
    v_booking_status, v_guest_id, v_start_date, v_total_amount,
    v_cancellation_policy, v_host_id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  IF v_guest_id <> p_user_id AND v_host_id <> p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to cancel this booking';
    END IF;
  END IF;

  IF v_booking_status NOT IN ('pending_payment', 'confirmed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking cannot be cancelled in its current status';
  END IF;

  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());

  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 1, 100.00, 0.00);
    WHEN 'moderada' THEN
      SET v_refund_percentage =
        CASE
          WHEN v_days_until_checkin >= 5 THEN 100.00
          WHEN v_days_until_checkin >= 3 THEN 50.00
          ELSE 0.00
        END;
    WHEN 'estricta' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 7, 50.00, 0.00);
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SET v_refund_amount = ROUND(v_total_amount * v_refund_percentage / 100, 2);

  UPDATE bookings
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = p_user_id,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_booking_id;

  SELECT id INTO v_payment_id
  FROM payments
  WHERE booking_id = p_booking_id
    AND status = 'approved'
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_payment_id IS NOT NULL AND v_refund_amount > 0 THEN
    INSERT INTO refund_requests (
      booking_id, payment_id, requested_by, requested_amount,
      refund_percentage, policy_applied, days_until_checkin, reason, status
    ) VALUES (
      p_booking_id, v_payment_id, p_user_id, v_refund_amount,
      v_refund_percentage, v_cancellation_policy, v_days_until_checkin,
      p_reason, 'pending'
    );

    SET v_refund_request_id = LAST_INSERT_ID();
    SET v_refund_status = 'pending';
  ELSEIF v_payment_id IS NOT NULL THEN
    SET v_refund_status = 'not_eligible';
  END IF;

  UPDATE payouts
  SET status = 'failed'
  WHERE booking_id = p_booking_id AND status IN ('pending', 'processing');

  COMMIT;

  SELECT
    p_booking_id AS booking_id,
    'cancelled' AS status,
    p_reason AS cancellation_reason,
    v_refund_amount AS refund_amount,
    v_refund_percentage AS refund_percentage,
    v_cancellation_policy AS policy_applied,
    v_days_until_checkin AS days_until_checkin,
    v_refund_request_id AS refund_request_id,
    v_refund_status AS refund_status;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_quote_cancellation (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_quote_cancellation;

DELIMITER //

CREATE PROCEDURE sp_quote_cancellation(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_user_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_guest_id BIGINT UNSIGNED;
  DECLARE v_host_id BIGINT UNSIGNED;
  DECLARE v_start_date DATE;
  DECLARE v_total_amount DECIMAL(10,2);
  DECLARE v_cancellation_policy VARCHAR(20);
  DECLARE v_days_until_checkin INT;
  DECLARE v_refund_percentage DECIMAL(5,2);
  DECLARE v_has_payment TINYINT DEFAULT 0;

  SELECT
    b.status, b.guest_id, b.start_date, b.total_amount,
    p.cancellation_policy, p.host_id
  INTO
    v_booking_status, v_guest_id, v_start_date, v_total_amount,
    v_cancellation_policy, v_host_id
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id;

  IF v_booking_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Booking not found';
  END IF;

  IF v_guest_id <> p_user_id AND v_host_id <> p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Unauthorized to view this booking';
    END IF;
  END IF;

  SET v_days_until_checkin = DATEDIFF(v_start_date, CURDATE());

  CASE v_cancellation_policy
    WHEN 'flexible' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 1, 100.00, 0.00);
    WHEN 'moderada' THEN
      SET v_refund_percentage =
        CASE
          WHEN v_days_until_checkin >= 5 THEN 100.00
          WHEN v_days_until_checkin >= 3 THEN 50.00
          ELSE 0.00
        END;
    WHEN 'estricta' THEN
      SET v_refund_percentage = IF(v_days_until_checkin >= 7, 50.00, 0.00);
    ELSE
      SET v_refund_percentage = 0.00;
  END CASE;

  SELECT COUNT(*) INTO v_has_payment
  FROM payments
  WHERE booking_id = p_booking_id AND status = 'approved';

  SELECT
    p_booking_id AS booking_id,
    v_booking_status AS current_status,
    (v_booking_status IN ('pending_payment','confirmed')) AS can_be_cancelled,
    v_total_amount AS total_amount,
    v_cancellation_policy AS policy_applied,
    v_days_until_checkin AS days_until_checkin,
    v_refund_percentage AS refund_percentage,
    ROUND(v_total_amount * v_refund_percentage / 100, 2) AS refund_amount,
    (v_has_payment > 0) AS has_payment,
    IF(v_has_payment = 0, 'no_payment',
      IF(v_refund_percentage = 0, 'not_eligible', 'requires_approval')) AS refund_outcome;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_start_refund (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_start_refund;

DELIMITER //

CREATE PROCEDURE sp_start_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_transaction_id VARCHAR(100);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT status, booking_id, payment_id, requested_amount
    INTO v_status, v_booking_id, v_payment_id, v_amount
  FROM refund_requests
  WHERE id = p_refund_request_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud de reembolso no encontrada';
  END IF;

  IF v_status <> 'pending' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'La solicitud ya fue procesada';
  END IF;

  SELECT wompi_transaction_id INTO v_transaction_id
  FROM payments
  WHERE id = v_payment_id;

  IF v_transaction_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El pago no tiene transacción de Wompi asociada';
  END IF;

  UPDATE refund_requests
  SET status = 'processing',
      reviewed_by = p_admin_id,
      reviewed_at = NOW()
  WHERE id = p_refund_request_id;

  COMMIT;

  SELECT
    p_refund_request_id AS refund_request_id,
    v_booking_id AS booking_id,
    v_payment_id AS payment_id,
    v_amount AS refund_amount,
    v_transaction_id AS wompi_transaction_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_settle_refund (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_settle_refund;

DELIMITER //

CREATE PROCEDURE sp_settle_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_success TINYINT,
  IN p_wompi_refund_id VARCHAR(100),
  IN p_failure_reason VARCHAR(500)
)
BEGIN
  DECLARE v_booking_id BIGINT UNSIGNED;
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_amount DECIMAL(10,2);
  DECLARE v_payment_amount DECIMAL(10,2);
  DECLARE v_already_refunded DECIMAL(10,2);
  DECLARE v_new_refunded DECIMAL(10,2);

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT booking_id, payment_id, requested_amount
    INTO v_booking_id, v_payment_id, v_amount
  FROM refund_requests
  WHERE id = p_refund_request_id AND status = 'processing'
  FOR UPDATE;

  IF v_booking_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud no encontrada o no está en proceso';
  END IF;

  IF p_success = 0 THEN
    UPDATE refund_requests
    SET status = 'failed',
        failure_reason = p_failure_reason
    WHERE id = p_refund_request_id;

    COMMIT;

    SELECT p_refund_request_id AS refund_request_id, 'failed' AS status;
  ELSE
    SELECT amount, refunded_amount INTO v_payment_amount, v_already_refunded
    FROM payments
    WHERE id = v_payment_id
    FOR UPDATE;

    SET v_new_refunded = v_already_refunded + v_amount;

    UPDATE payments
    SET refunded_amount = v_new_refunded,
        status = IF(v_new_refunded >= v_payment_amount, 'refunded', 'partially_refunded')
    WHERE id = v_payment_id;

    UPDATE bookings
    SET status = 'refunded', updated_at = NOW()
    WHERE id = v_booking_id;

    UPDATE payouts
    SET status = 'failed'
    WHERE booking_id = v_booking_id AND status IN ('pending', 'processing');

    UPDATE refund_requests
    SET status = 'approved',
        wompi_refund_id = p_wompi_refund_id
    WHERE id = p_refund_request_id;

    COMMIT;

    SELECT
      p_refund_request_id AS refund_request_id,
      'approved' AS status,
      v_booking_id AS booking_id,
      v_amount AS refund_amount;
  END IF;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_reject_refund (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_reject_refund;

DELIMITER //

CREATE PROCEDURE sp_reject_refund(
  IN p_refund_request_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_notes VARCHAR(500)
)
BEGIN
  DECLARE v_status VARCHAR(20);

  SELECT status INTO v_status
  FROM refund_requests
  WHERE id = p_refund_request_id;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud de reembolso no encontrada';
  END IF;

  IF v_status NOT IN ('pending', 'failed') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Sólo se pueden rechazar solicitudes pendientes o fallidas';
  END IF;

  UPDATE refund_requests
  SET status = 'rejected',
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      review_notes = p_notes
  WHERE id = p_refund_request_id;

  SELECT p_refund_request_id AS refund_request_id, 'rejected' AS status;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_request_manual_refund (051)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_request_manual_refund;

DELIMITER //

CREATE PROCEDURE sp_request_manual_refund(
  IN p_booking_id BIGINT UNSIGNED,
  IN p_admin_id BIGINT UNSIGNED,
  IN p_amount DECIMAL(10,2),
  IN p_reason VARCHAR(500)
)
BEGIN
  DECLARE v_payment_id BIGINT UNSIGNED;
  DECLARE v_payment_amount DECIMAL(10,2);
  DECLARE v_already_refunded DECIMAL(10,2);
  DECLARE v_start_date DATE;

  SELECT p.id, p.amount, p.refunded_amount, b.start_date
    INTO v_payment_id, v_payment_amount, v_already_refunded, v_start_date
  FROM payments p
  JOIN bookings b ON p.booking_id = b.id
  WHERE p.booking_id = p_booking_id
    AND p.status IN ('approved', 'partially_refunded')
  ORDER BY p.id DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'No hay pago reembolsable para esta reserva';
  END IF;

  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El monto a reembolsar debe ser mayor que cero';
  END IF;

  IF (v_already_refunded + p_amount) > v_payment_amount THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El reembolso excede el monto pagado';
  END IF;

  INSERT INTO refund_requests (
    booking_id, payment_id, requested_by, requested_amount,
    refund_percentage, policy_applied, days_until_checkin, reason, status
  ) VALUES (
    p_booking_id, v_payment_id, p_admin_id, p_amount,
    ROUND(p_amount / v_payment_amount * 100, 2), 'manual',
    DATEDIFF(v_start_date, CURDATE()), p_reason, 'pending'
  );

  SELECT LAST_INSERT_ID() AS refund_request_id;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp_expire_pending_payments (051 — final, unified)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp_expire_pending_payments;

DELIMITER //

CREATE PROCEDURE sp_expire_pending_payments()
BEGIN
  DECLARE v_expired_count INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  UPDATE bookings b
  SET b.status = 'expired', b.updated_at = NOW()
  WHERE b.status = 'pending_payment'
    AND b.expires_at < NOW()
    AND NOT EXISTS (
      SELECT 1 FROM payments p
      WHERE p.booking_id = b.id AND p.status = 'approved'
    );

  SET v_expired_count = ROW_COUNT();

  UPDATE payments p
  JOIN bookings b ON p.booking_id = b.id
  SET p.status = 'declined'
  WHERE b.status = 'expired' AND p.status = 'pending';

  COMMIT;

  SELECT v_expired_count AS expired_bookings;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp__add_column_if_missing (051 — utility)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp__add_column_if_missing;

DELIMITER //

CREATE PROCEDURE sp__add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;


-- ─────────────────────────────────────────────────────────────────────────────
-- sp__add_unique_index_if_missing (051 — utility)
-- ─────────────────────────────────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS sp__add_unique_index_if_missing;

DELIMITER //

CREATE PROCEDURE sp__add_unique_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_columns VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE INDEX `', p_index_name, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;


-- ============================================================================
-- 5. DEFAULT DATA
-- ============================================================================

-- platform_settings defaults (052)
INSERT IGNORE INTO platform_settings (key_name, value_number) VALUES
  ('default_commission_rate', 15.00),
  ('booking_expiry_minutes', 15),
  ('min_booking_nights', 1),
  ('max_booking_nights', 365);

INSERT IGNORE INTO platform_settings (key_name, value_json) VALUES
  ('cancellation_policies', '["flexible","moderada","estricta"]'),
  ('enabled_cities', '["Medellín","Cartagena"]');

INSERT IGNORE INTO platform_settings (key_name, value_number) VALUES
  ('refund_requires_approval', 1);

-- exchange_rates defaults (046)
INSERT INTO exchange_rates (currency_code, rate_to_cop) VALUES
  ('USD', 4200.000000),
  ('EUR', 4500.000000),
  ('COP', 1.000000)
ON DUPLICATE KEY UPDATE rate_to_cop = VALUES(rate_to_cop);

-- ============================================================================
-- END OF CONSOLIDATED DDL
-- ============================================================================
