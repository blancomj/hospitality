-- ============================================
-- Migración 001: Tabla users
-- CONSTRUESCALA Hospitality
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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

-- Índices útiles para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
