-- ============================================
-- Migración 020: v_bookings_detail
-- Vista de detalle de reservas
-- CONSTRUESCALA Hospitality
-- ============================================

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
  
  -- Property details
  p.title AS property_title,
  p.city AS property_city,
  p.neighborhood AS property_neighborhood,
  p.property_type AS property_type,
  p.max_guests AS property_max_guests,
  p.bedrooms AS property_bedrooms,
  p.host_id AS property_host_id,
  
  -- Guest details
  u.full_name AS guest_name,
  u.email AS guest_email,
  u.phone AS guest_phone,
  u.avatar_url AS guest_avatar,
  
  -- Host details
  hu.full_name AS host_name,
  hu.email AS host_email,
  
  -- Calculated fields
  DATEDIFF(b.end_date, b.start_date) AS total_nights,
  CASE 
    WHEN b.status = 'confirmed' AND b.end_date <= CURDATE() THEN TRUE
    ELSE FALSE
  END AS is_completed,
  CASE 
    WHEN b.status IN ('pending_payment', 'confirmed') AND b.start_date > CURDATE() THEN TRUE
    ELSE FALSE
  END AS can_be_cancelled

FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users u ON b.guest_id = u.id
JOIN users hu ON p.host_id = hu.id;
