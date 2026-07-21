import pool from '../../db/connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const getUserFavorites = async (userId: number): Promise<number[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT property_id FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(row => row.property_id);
};

export const addFavorite = async (userId: number, propertyId: number): Promise<boolean> => {
  try {
    await pool.execute(
      'INSERT INTO user_favorites (user_id, property_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = NOW()',
      [userId, propertyId]
    );
    return true;
  } catch (error) {
    console.error('Error adding favorite:', error);
    return false;
  }
};

export const removeFavorite = async (userId: number, propertyId: number): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM user_favorites WHERE user_id = ? AND property_id = ?',
    [userId, propertyId]
  );
  return result.affectedRows > 0;
};

export const isFavorite = async (userId: number, propertyId: number): Promise<boolean> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM user_favorites WHERE user_id = ? AND property_id = ?',
    [userId, propertyId]
  );
  return rows.length > 0;
};
