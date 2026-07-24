-- ============================================
-- Migración 040: Agregar firebase_uid y SP upsert_firebase_user
-- CONSTRUESCALA Hospitality
-- ============================================

-- Columna firebase_uid para login con Firebase Auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(64) UNIQUE AFTER google_id;
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Procedimiento upsert para Firebase Auth
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

  -- Buscar por firebase_uid
  SELECT id INTO v_user_id
  FROM users
  WHERE firebase_uid = p_firebase_uid
  LIMIT 1;

  -- Si no existe, buscar por email
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email
    LIMIT 1;

    -- Si existe por email, vincular firebase_uid
    IF v_user_id IS NOT NULL THEN
      UPDATE users
      SET firebase_uid = p_firebase_uid,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;

  -- Si no existe, crear nuevo usuario
  IF v_user_id IS NULL THEN
    INSERT INTO users (firebase_uid, email, full_name, avatar_url, role)
    VALUES (p_firebase_uid, p_email, p_full_name, p_avatar_url, 'guest');

    SET v_user_id = LAST_INSERT_ID();
  ELSE
    -- Actualizar datos
    UPDATE users
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;

  -- Retornar el registro completo
  SELECT
    id,
    firebase_uid,
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
