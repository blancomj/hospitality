import pool from '../../db/connection.js';
import { RowDataPacket } from 'mysql2';
import { SearchFilters } from '../../types/index.js';

export const searchProperties = async (filters: SearchFilters): Promise<any[]> => {
  const { city, startDate, endDate, guests, minPrice, maxPrice, amenities, type } = filters;

  const amenitiesStr = amenities && amenities.length > 0 ? amenities.join(',') : null;

  const [rows] = await pool.execute(
    'CALL sp_search_properties(?, ?, ?, ?, ?, ?, ?, ?)',
    [
      city || null,
      startDate || null,
      endDate || null,
      guests || null,
      minPrice || null,
      maxPrice || null,
      type || null,
      amenitiesStr,
    ]
  );
  const result = rows as any;
  return result[0];
};

export const getCities = async (): Promise<any[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT city, COUNT(*) as property_count 
     FROM properties 
     WHERE status = 'published' 
     GROUP BY city 
     ORDER BY city ASC`
  );
  return rows;
};

export const searchPropertiesForMap = async (city?: string): Promise<any[]> => {
  let query = `
    SELECT id, title, latitude, longitude, base_price_per_night, main_photo_url
    FROM v_search_properties
    WHERE status = 'published'
  `;
  
  const params: any[] = [];

  if (city) {
    query += ' AND city = ?';
    params.push(city);
  }

  query += ' AND latitude IS NOT NULL AND longitude IS NOT NULL';

  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  return rows;
};
