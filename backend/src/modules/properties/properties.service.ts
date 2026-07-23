import pool from '../../db/connection.js';
import { randomBytes } from 'crypto';
import { 
  PropertyRow, PropertyPhotoRow, PropertyVideoRow, 
  AmenityCatalogRow, PropertyAmenityRow, AvailabilityOverrideRow,
  BookingRow, CreatePropertyData, UpdatePropertyData, UpdateLocationData,
  AmenityUpdate, AvailabilityOverride, Property
} from '../../types/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const getPropertyById = async (id: number | string, locale: string = 'es'): Promise<Property | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM v_property_detail WHERE id = ?`,
    [id]
  );
  
  if (rows.length === 0) return null;
  
  const property = rows[0] as any;
  
  const safeJsonParse = (val: any, fallback: any[] = []) => {
    if (!val) return fallback;
    if (typeof val === 'object') return val; // already parsed by mysql2
    try { return JSON.parse(val); } catch { return fallback; }
  };

  property.photos = safeJsonParse(property.photos);
  property.videos = safeJsonParse(property.videos);
  property.amenities = safeJsonParse(property.amenities);
  property.translations = safeJsonParse(property.translations);
  
  const translation = property.translations.find((t: any) => t.locale === locale);
  if (translation) {
    property.title = translation.title;
    property.description = translation.description;
    property.is_auto_translated = translation.is_auto_translated;
  }
  
  return property as Property;
};

export const createProperty = async (hostId: number, data: CreatePropertyData): Promise<Property | null> => {
  const {
    title, description, city, address, neighborhood,
    latitude, longitude, showExactLocation, directionsNote, areaNote,
    propertyType, maxGuests, bedrooms, beds, bathrooms, areaM2,
    basePricePerNight, cancellationPolicy,
  } = data;

  const icalExportToken = randomBytes(32).toString('hex');

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO properties (
      host_id, title, description, city, address, neighborhood,
      latitude, longitude, show_exact_location, directions_note, area_note,
      property_type, max_guests, bedrooms, beds, bathrooms, area_m2,
      base_price_per_night, cancellation_policy, ical_export_token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hostId, title, description || null, city, address || null, neighborhood || null,
      latitude || null, longitude || null, showExactLocation || false, directionsNote || null, areaNote || null,
      propertyType, maxGuests || 2, bedrooms || 1, beds || 1, bathrooms || 1.0, areaM2 || null,
      basePricePerNight, cancellationPolicy || 'moderada', icalExportToken,
    ]
  );

  return getPropertyById(result.insertId);
};

export const updateProperty = async (
  propertyId: number | string, 
  hostId: number, 
  data: UpdatePropertyData
): Promise<Property | null> => {
  const allowedFields = [
    'title', 'description', 'city', 'address', 'neighborhood',
    'latitude', 'longitude', 'show_exact_location', 'directions_note', 'area_note',
    'property_type', 'max_guests', 'bedrooms', 'beds', 'bathrooms', 'area_m2',
    'base_price_per_night', 'cancellation_policy', 'status',
  ];

  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbField) && value !== undefined) {
      updates.push(`${dbField} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) {
    return getPropertyById(propertyId);
  }

  values.push(propertyId, hostId);

  await pool.execute(
    `UPDATE properties SET ${updates.join(', ')} WHERE id = ? AND host_id = ?`,
    values
  );

  return getPropertyById(propertyId);
};

export const deleteProperty = async (propertyId: number | string, hostId: number): Promise<boolean> => {
  await pool.execute(
    `UPDATE properties SET status = 'draft' WHERE id = ? AND host_id = ?`,
    [propertyId, hostId]
  );
  return true;
};

export const getPropertiesByHost = async (hostId: number): Promise<PropertyRow[]> => {
  const [rows] = await pool.execute(
    'CALL sp_get_my_properties(?)',
    [hostId]
  );
  const result = rows as any;
  return result[0] as PropertyRow[];
};

export const addPropertyPhoto = async (
  propertyId: number | string, 
  hostId: number, 
  url: string, 
  thumbnailUrl: string | null = null, 
  sortOrder: number = 0
): Promise<{ id: number; url: string; thumbnailUrl: string | null; sortOrder: number }> => {
  const [prop] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM properties WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );
  
  if (prop.length === 0) {
    throw new Error('Propiedad no encontrada o no autorizado');
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO property_photos (property_id, image_url, is_primary) VALUES (?, ?, ?)',
    [propertyId, url, sortOrder === 0 ? 1 : 0]
  );

  return { id: result.insertId, url, thumbnailUrl, sortOrder };
};

export const deletePropertyPhoto = async (
  photoId: number | string, 
  propertyId: number | string, 
  hostId: number
): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM property_photos WHERE id = ? AND property_id = ? AND property_id IN (
      SELECT id FROM properties WHERE host_id = ?
    )`,
    [photoId, propertyId, hostId]
  );
  return result.affectedRows > 0;
};

export const reorderPropertyPhotos = async (
  propertyId: number | string,
  hostId: number,
  photoIds: number[]
): Promise<void> => {
  const [prop] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM properties WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );
  
  if (prop.length === 0) {
    throw new Error('Propiedad no encontrada o no autorizado');
  }

  for (let i = 0; i < photoIds.length; i++) {
    await pool.execute(
      'UPDATE property_photos SET is_primary = ? WHERE id = ? AND property_id = ?',
      [i === 0 ? 1 : 0, photoIds[i], propertyId]
    );
  }
};

export const addPropertyVideo = async (
  propertyId: number | string, 
  hostId: number, 
  source: string, 
  url: string, 
  thumbnailUrl: string | null = null
): Promise<{ id: number; source: string; url: string; thumbnailUrl: string | null }> => {
  const [prop] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM properties WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );
  
  if (prop.length === 0) {
    throw new Error('Propiedad no encontrada o no autorizado');
  }

  if (source === 'upload') {
    const [videoCount] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM property_videos WHERE property_id = ? AND source = ?',
      [propertyId, 'upload']
    );
    
    if ((videoCount[0] as any).count >= 2) {
      throw new Error('Máximo 2 videos de carga directa por propiedad');
    }
  }

  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO property_videos (property_id, source, url, thumbnail_url) VALUES (?, ?, ?, ?)',
    [propertyId, source, url, thumbnailUrl]
  );

  return { id: result.insertId, source, url, thumbnailUrl };
};

export const deletePropertyVideo = async (
  videoId: number | string, 
  propertyId: number | string, 
  hostId: number
): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM property_videos WHERE id = ? AND property_id = ? AND property_id IN (
      SELECT id FROM properties WHERE host_id = ?
    )`,
    [videoId, propertyId, hostId]
  );
  return result.affectedRows > 0;
};

export const updatePropertyLocation = async (
  propertyId: number | string, 
  hostId: number, 
  data: UpdateLocationData
): Promise<Property | null> => {
  const { latitude, longitude, address, neighborhood, showExactLocation, directionsNote, areaNote } = data;

  await pool.execute(
    `UPDATE properties SET 
      latitude = ?, longitude = ?, address = ?, neighborhood = ?,
      show_exact_location = ?, directions_note = ?, area_note = ?
    WHERE id = ? AND host_id = ?`,
    [latitude, longitude, address || null, neighborhood || null, showExactLocation || false, directionsNote || null, areaNote || null, propertyId, hostId]
  );

  return getPropertyById(propertyId);
};

export const getPropertyAmenities = async (propertyId: number | string): Promise<any[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ac.id, ac.category, ac.name, ac.icon, pa.detail
     FROM property_amenities pa
     JOIN amenity_catalog ac ON pa.amenity_id = ac.id
     WHERE pa.property_id = ? AND ac.is_active = TRUE
     ORDER BY ac.category, ac.sort_order`,
    [propertyId]
  );
  return rows;
};

export const updatePropertyAmenities = async (
  propertyId: number | string, 
  hostId: number, 
  amenities: AmenityUpdate[]
): Promise<any[]> => {
  const [prop] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM properties WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );
  
  if (prop.length === 0) {
    throw new Error('Propiedad no encontrada o no autorizado');
  }

  await pool.execute(
    'DELETE FROM property_amenities WHERE property_id = ?',
    [propertyId]
  );

  if (amenities && amenities.length > 0) {
    const values = amenities.map(a => [propertyId, a.amenityId, a.detail || null]);
    const placeholders = values.map(() => '(?, ?, ?)').join(', ');
    
    await pool.execute(
      `INSERT INTO property_amenities (property_id, amenity_id, detail) VALUES ${placeholders}`,
      values.flat()
    );
  }

  return getPropertyAmenities(propertyId);
};

export const getAmenityCatalog = async (): Promise<Record<string, any[]>> => {
  const [rows] = await pool.execute<AmenityCatalogRow[]>(
    'SELECT * FROM amenity_catalog WHERE is_active = TRUE ORDER BY category, sort_order'
  );
  
  const grouped: Record<string, any[]> = {};
  for (const row of rows) {
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push(row);
  }
  
  return grouped;
};

export const getPropertyAvailability = async (
  propertyId: number | string, 
  month: string
): Promise<{ overrides: any[]; bookings: any[] }> => {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  const [overrides] = await pool.execute<RowDataPacket[]>(
    `SELECT date, is_blocked, special_price 
     FROM availability_overrides 
     WHERE property_id = ? AND date BETWEEN ? AND ?`,
    [propertyId, startDate, endDate]
  );

  const [bookings] = await pool.execute<RowDataPacket[]>(
    `SELECT start_date, end_date, status
     FROM bookings 
     WHERE property_id = ? 
       AND status IN ('confirmed', 'pending_payment')
       AND start_date <= ? AND end_date >= ?`,
    [propertyId, endDate, startDate]
  );

  return { overrides, bookings };
};

export const updatePropertyAvailability = async (
  propertyId: number | string, 
  hostId: number, 
  overrides: AvailabilityOverride[]
): Promise<{ overrides: any[]; bookings: any[] }> => {
  const [prop] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM properties WHERE id = ? AND host_id = ?',
    [propertyId, hostId]
  );
  
  if (prop.length === 0) {
    throw new Error('Propiedad no encontrada o no autorizado');
  }

  await pool.execute(
    'DELETE FROM availability_overrides WHERE property_id = ?',
    [propertyId]
  );

  if (overrides && overrides.length > 0) {
    const values = overrides.map(o => [propertyId, o.date, o.isBlocked || false, o.specialPrice || null]);
    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    
    await pool.execute(
      `INSERT INTO availability_overrides (property_id, date, is_blocked, special_price) VALUES ${placeholders}`,
      values.flat()
    );
  }

  return getPropertyAvailability(propertyId, overrides[0]?.date?.substring(0, 7) || new Date().toISOString().substring(0, 7));
};
