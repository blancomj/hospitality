import pool from '../../db/connection.js';

interface CreateReviewResult {
  review_id: number;
  booking_id: number;
  property_id: number;
  rating: number;
  comment: string | null;
}

interface ReviewReplyResult {
  review_id: number;
  host_reply: string;
}

interface PropertyReview {
  id: number;
  booking_id: number;
  property_id: number;
  guest_id: number;
  guest_name: string;
  guest_avatar: string | null;
  rating: number;
  comment: string | null;
  host_reply: string | null;
  created_at: Date;
}

export async function createReview(
  bookingId: number,
  guestId: number,
  rating: number,
  comment: string | null
): Promise<CreateReviewResult> {
  const [rows] = await pool.execute(
    'CALL sp_create_review(?, ?, ?, ?)',
    [bookingId, guestId, rating, comment]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function replyToReview(
  reviewId: number,
  hostId: number,
  reply: string
): Promise<ReviewReplyResult> {
  const [rows] = await pool.execute(
    'CALL sp_reply_review(?, ?, ?)',
    [reviewId, hostId, reply]
  );

  const result = (rows as any)[0][0];
  return result;
}

export async function getPropertyReviews(
  propertyId: number
): Promise<PropertyReview[]> {
  const [rows] = await pool.execute(
    `SELECT 
      r.id,
      r.booking_id,
      r.property_id,
      r.guest_id,
      u.full_name AS guest_name,
      u.avatar_url AS guest_avatar,
      r.rating,
      r.comment,
      r.host_reply,
      r.created_at
    FROM reviews r
    JOIN users u ON r.guest_id = u.id
    WHERE r.property_id = ?
    ORDER BY r.created_at DESC`,
    [propertyId]
  );

  return rows as PropertyReview[];
}

export async function getPropertyAverageRating(
  propertyId: number
): Promise<{ average: number; count: number }> {
  const [rows] = await pool.execute(
    `SELECT 
      COALESCE(AVG(rating), 0) AS average,
      COUNT(*) AS count
    FROM reviews
    WHERE property_id = ?`,
    [propertyId]
  );

  const result = (rows as any)[0];
  return {
    average: parseFloat(result.average) || 0,
    count: result.count || 0,
  };
}
