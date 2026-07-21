-- Migration 039: Create user_favorites table
-- Stores user's favorited properties for the "Save to Favorites" feature

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
