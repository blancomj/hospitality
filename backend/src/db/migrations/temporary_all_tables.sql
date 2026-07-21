-- =========================================================
-- Archivo temporal consolidado de tablas y vistas
-- Generado a partir de las migraciones de creación de esquema
-- =========================================================

USE u434343788_escala;

-- =========================================================
-- 001: create_users
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  google_id VARCHAR(64) NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  phone VARCHAR(20) NULL,
  locale VARCHAR(10) NULL,
  role ENUM('guest','host','admin') NOT NULL DEFAULT 'guest',
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  id_verified TINYINT(1) NOT NULL DEFAULT 0,
  fast_response TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 002: create_host_profiles
-- =========================================================

CREATE TABLE IF NOT EXISTS host_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bio TEXT NULL,
  city VARCHAR(100) NULL,
  country VARCHAR(100) NULL,
  currency VARCHAR(10) NULL,
  bank_name VARCHAR(100) NULL,
  bank_account_number VARCHAR(100) NULL,
  bank_account_type VARCHAR(30) NULL,
  custom_commission_rate DECIMAL(5,2) NULL DEFAULT 15.00,
  approval_status ENUM('pending_approval','approved','rejected') NOT NULL DEFAULT 'pending_approval',
  approved_by BIGINT UNSIGNED NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_host_profiles_user_id (user_id),
  CONSTRAINT fk_host_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 004: create_properties
-- =========================================================

CREATE TABLE IF NOT EXISTS properties (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  host_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  address VARCHAR(255) NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  base_price_per_night DECIMAL(10,2) NOT NULL,
  max_guests SMALLINT UNSIGNED NOT NULL DEFAULT 4,
  bedrooms SMALLINT UNSIGNED NULL,
  bathrooms SMALLINT UNSIGNED NULL,
  cancellation_policy VARCHAR(20) NOT NULL DEFAULT 'flexible',
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_properties_host_id (host_id),
  KEY idx_properties_city (city),
  KEY idx_properties_status (status),
  CONSTRAINT fk_properties_host FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 005: create_amenity_catalog
-- =========================================================

CREATE TABLE IF NOT EXISTS amenity_catalog (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_amenity_catalog_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 006: create_property_amenities
-- =========================================================

CREATE TABLE IF NOT EXISTS property_amenities (
  property_id BIGINT UNSIGNED NOT NULL,
  amenity_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id, amenity_id),
  CONSTRAINT fk_property_amenities_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_property_amenities_amenity FOREIGN KEY (amenity_id) REFERENCES amenity_catalog (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 007: create_property_photos
-- =========================================================

CREATE TABLE IF NOT EXISTS property_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_property_photos_property_id (property_id),
  CONSTRAINT fk_property_photos_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 008: create_property_videos
-- =========================================================

CREATE TABLE IF NOT EXISTS property_videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_property_videos_property_id (property_id),
  CONSTRAINT fk_property_videos_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 009: create_property_translations
-- =========================================================

CREATE TABLE IF NOT EXISTS property_translations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_property_translations (property_id, locale),
  CONSTRAINT fk_property_translations_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 010: create_availability_overrides
-- =========================================================

CREATE TABLE IF NOT EXISTS availability_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  special_price DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_availability_overrides (property_id, date),
  CONSTRAINT fk_availability_overrides_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 014: create_bookings
-- =========================================================

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  guest_id BIGINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guests_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_per_night DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending_payment','confirmed','cancelled','completed','refunded','expired') NOT NULL DEFAULT 'pending_payment',
  expires_at TIMESTAMP NULL,
  cancellation_reason TEXT NULL,
  cancelled_by BIGINT UNSIGNED NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_property_id (property_id),
  KEY idx_bookings_guest_id (guest_id),
  KEY idx_bookings_status (status),
  CONSTRAINT fk_bookings_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_guest FOREIGN KEY (guest_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 015: create_payments
-- =========================================================

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','approved','refunded','failed') NOT NULL DEFAULT 'pending',
  wompi_transaction_id VARCHAR(100) NULL,
  payment_method VARCHAR(30) NULL,
  raw_webhook_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_booking_id (booking_id),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 016: create_payouts
-- =========================================================

CREATE TABLE IF NOT EXISTS payouts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  host_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payouts_booking_id (booking_id),
  KEY idx_payouts_host_id (host_id),
  CONSTRAINT fk_payouts_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
  CONSTRAINT fk_payouts_host FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 031: create_platform_settings
-- =========================================================

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

-- =========================================================
-- 032: create_admin_audit_log
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_log_admin_id (admin_id),
  CONSTRAINT fk_admin_audit_log_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 036: create_ical_links
-- =========================================================

CREATE TABLE IF NOT EXISTS ical_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ical_links_token (token),
  KEY idx_ical_links_property_id (property_id),
  CONSTRAINT fk_ical_links_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- 011: seed_amenity_catalog
-- =========================================================

INSERT INTO amenity_catalog (name, icon) VALUES
  ('WiFi', 'wifi'),
  ('Parking', 'car'),
  ('Pool', 'pool'),
  ('Air Conditioning', 'snowflake'),
  ('Kitchen', 'kitchen'),
  ('Laundry', 'washing-machine')
  ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =========================================================
-- 012: create_v_search_properties
-- =========================================================

CREATE OR REPLACE VIEW v_search_properties AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.city,
  p.country,
  p.base_price_per_night,
  p.max_guests,
  p.status,
  p.created_at,
  p.updated_at,
  (SELECT MIN(ph.image_url) FROM property_photos ph WHERE ph.property_id = p.id) AS primary_photo,
  (SELECT COUNT(*) FROM property_amenities pa WHERE pa.property_id = p.id) AS amenity_count
FROM properties p;

-- =========================================================
-- 013: create_v_property_detail
-- =========================================================

CREATE OR REPLACE VIEW v_property_detail AS
SELECT
  p.id,
  p.host_id,
  p.title,
  p.description,
  p.city,
  p.country,
  p.address,
  p.latitude,
  p.longitude,
  p.base_price_per_night,
  p.max_guests,
  p.bedrooms,
  p.bathrooms,
  p.cancellation_policy,
  p.status,
  p.created_at,
  p.updated_at,
  (SELECT MIN(ph.image_url) FROM property_photos ph WHERE ph.property_id = p.id) AS primary_photo,
  (SELECT GROUP_CONCAT(DISTINCT ac.name ORDER BY ac.name SEPARATOR ', ') FROM property_amenities pa JOIN amenity_catalog ac ON pa.amenity_id = ac.id WHERE pa.property_id = p.id) AS amenities
FROM properties p;

-- =========================================================
-- 020: v_bookings_detail
-- =========================================================

CREATE OR REPLACE VIEW v_bookings_detail AS
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
  b.created_at,
  b.updated_at,
  p.title AS property_title,
  p.city AS property_city,
  u.full_name AS guest_name,
  u.email AS guest_email
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.guest_id = u.id;

-- =========================================================
-- 027: v_commission_report
-- =========================================================

CREATE OR REPLACE VIEW v_commission_report AS
SELECT
  p.id AS property_id,
  p.title AS property_title,
  p.host_id,
  p.base_price_per_night,
  b.id AS booking_id,
  b.total_amount,
  ROUND(b.total_amount * 0.15, 2) AS commission_amount,
  ROUND(b.total_amount - (b.total_amount * 0.15), 2) AS net_amount,
  b.status,
  b.created_at
FROM bookings b
JOIN properties p ON b.property_id = p.id;

-- =========================================================
-- 033: v_host_dashboard
-- =========================================================

CREATE OR REPLACE VIEW v_host_dashboard AS
SELECT
  p.host_id,
  COUNT(DISTINCT p.id) AS property_count,
  COUNT(DISTINCT b.id) AS booking_count,
  SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) AS confirmed_revenue,
  SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END) AS completed_revenue,
  SUM(CASE WHEN b.status = 'cancelled' THEN b.total_amount ELSE 0 END) AS cancelled_revenue
FROM properties p
LEFT JOIN bookings b ON p.id = b.property_id
GROUP BY p.host_id;

-- =========================================================
-- 034: v_admin_kpis
-- =========================================================

CREATE OR REPLACE VIEW v_admin_kpis AS
SELECT
  COUNT(DISTINCT u.id) AS total_users,
  COUNT(DISTINCT p.id) AS total_properties,
  COUNT(DISTINCT b.id) AS total_bookings,
  SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) AS confirmed_revenue,
  SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END) AS completed_revenue
FROM users u
LEFT JOIN properties p ON u.id = p.host_id
LEFT JOIN bookings b ON p.id = b.property_id;
