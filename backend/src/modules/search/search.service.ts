import pool from '../../db/connection.js';
import { RowDataPacket } from 'mysql2';
import { SearchFilters } from '../../types/index.js';

export const searchProperties = async (filters: SearchFilters): Promise<any[]> => {
  const { city, startDate, endDate, guests, minPrice, maxPrice, amenities, type } = filters;

  let query = `
    SELECT 
      vsp.*,
      (SELECT COUNT(*) FROM availability_overrides ao 
       WHERE ao.property_id = vsp.id AND ao.is_blocked = TRUE
       AND ao.date BETWEEN ? AND ?) AS blocked_dates_count
    FROM v_search_properties vsp
    WHERE vsp.status = 'published'
  `;
  
  const params: any[] = [startDate || '2000-01-01', endDate || '2099-12-31'];

  if (city) {
    query += ' AND vsp.city = ?';
    params.push(city);
  }

  if (guests) {
    query += ' AND vsp.max_guests >= ?';
    params.push(guests);
  }

  if (minPrice) {
    query += ' AND vsp.base_price_per_night >= ?';
    params.push(minPrice);
  }
  if (maxPrice) {
    query += ' AND vsp.base_price_per_night <= ?';
    params.push(maxPrice);
  }

  if (type) {
    query += ' AND vsp.property_type = ?';
    params.push(type);
  }

  if (startDate && endDate) {
    query += `
      AND vsp.id NOT IN (
        SELECT property_id FROM bookings 
        WHERE status IN ('confirmed', 'pending_payment')
        AND start_date < ? AND end_date > ?
      )
    `;
    params.push(endDate, startDate);
  }

  if (amenities && amenities.length > 0) {
    const amenityPlaceholders = amenities.map(() => '?').join(',');
    query += `
      AND vsp.id IN (
        SELECT property_id FROM property_amenities 
        WHERE amenity_id IN (${amenityPlaceholders})
        GROUP BY property_id
        HAVING COUNT(DISTINCT amenity_id) = ?
      )
    `;
    params.push(...amenities, amenities.length);
  }

  query += ' ORDER BY vsp.base_price_per_night ASC';

  const [rows] = await pool.execute<RowDataPacket[]>(query, params);
  return rows;
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
