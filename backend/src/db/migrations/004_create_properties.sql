-- ============================================
-- Migración 004: Tabla properties
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS properties (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  host_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  neighborhood VARCHAR(100),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  show_exact_location BOOLEAN NOT NULL DEFAULT FALSE,
  directions_note TEXT,
  area_note TEXT,
  property_type ENUM('apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion') NOT NULL,
  max_guests SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  bedrooms SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  beds SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  area_m2 SMALLINT UNSIGNED NULL,
  base_price_per_night DECIMAL(10,2) NOT NULL,
  cancellation_policy ENUM('flexible', 'moderada', 'estricta') NOT NULL DEFAULT 'moderada',
  status ENUM('draft', 'published', 'paused') NOT NULL DEFAULT 'draft',
  ical_export_token VARCHAR(64) UNIQUE,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  review_count SMALLINT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city_status (city, status),
  INDEX idx_host_id (host_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- Generar token iCal único para cada propiedad
-- (Se ejecutará via trigger o aplicación)
