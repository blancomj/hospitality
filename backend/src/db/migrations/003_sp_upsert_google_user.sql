-- ============================================
-- Migración 003: Procedimiento sp_upsert_google_user
-- CONSTRUESCALA Hospitality
-- Crea o encuentra un usuario por google_id de forma atómica
-- ============================================

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
  
  -- Intentar encontrar usuario existente por google_id
  SELECT id INTO v_user_id 
  FROM users 
  WHERE google_id = p_google_id 
  LIMIT 1;
  
  -- Si no existe, buscar por email (podría haberse registrado con otro método)
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM users 
    WHERE email = p_email 
    LIMIT 1;
    
    -- Si existe por email, vincular el google_id
    IF v_user_id IS NOT NULL THEN
      UPDATE users 
      SET google_id = p_google_id,
          avatar_url = COALESCE(p_avatar_url, avatar_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_user_id;
    END IF;
  END IF;
  
  -- Si no existe en absoluto, crear nuevo usuario
  IF v_user_id IS NULL THEN
    INSERT INTO users (google_id, email, full_name, avatar_url, role)
    VALUES (p_google_id, p_email, p_full_name, p_avatar_url, 'guest');
    
    SET v_user_id = LAST_INSERT_ID();
  ELSE
    -- Actualizar datos del usuario existente (nombre, avatar pueden cambiar)
    UPDATE users 
    SET full_name = p_full_name,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id;
  END IF;
  
  -- Retornar el registro completo del usuario
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
