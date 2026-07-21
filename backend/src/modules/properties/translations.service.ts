import pool from '../../db/connection.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface PropertyTranslation {
  propertyId: number;
  locale: string;
  title: string;
  description: string | null;
  isAutoTranslated: boolean;
}

export const getPropertyTranslations = async (propertyId: number | string): Promise<PropertyTranslation[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM property_translations WHERE property_id = ? ORDER BY locale',
    [propertyId]
  );
  
  return rows.map(row => ({
    propertyId: row.property_id,
    locale: row.locale,
    title: row.title,
    description: row.description,
    isAutoTranslated: row.is_auto_translated,
  }));
};

export const getPropertyTranslation = async (
  propertyId: number | string, 
  locale: string
): Promise<PropertyTranslation | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM property_translations WHERE property_id = ? AND locale = ?',
    [propertyId, locale]
  );
  
  const row = rows[0];
  if (!row) return null;
  
  return {
    propertyId: row.property_id,
    locale: row.locale,
    title: row.title,
    description: row.description,
    isAutoTranslated: row.is_auto_translated,
  };
};

export const upsertPropertyTranslation = async (
  propertyId: number | string,
  locale: string,
  title: string,
  description: string | null = null,
  isAutoTranslated: boolean = false
): Promise<PropertyTranslation> => {
  await pool.execute(
    `INSERT INTO property_translations (property_id, locale, title, description, is_auto_translated)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       title = VALUES(title),
       description = VALUES(description),
       is_auto_translated = VALUES(is_auto_translated)`,
    [propertyId, locale, title, description, isAutoTranslated]
  );
  
  const translation = await getPropertyTranslation(propertyId, locale);
  if (!translation) {
    throw new Error('Error upserting translation');
  }
  return translation;
};

export const deletePropertyTranslation = async (
  propertyId: number | string,
  locale: string
): Promise<boolean> => {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM property_translations WHERE property_id = ? AND locale = ?',
    [propertyId, locale]
  );
  return result.affectedRows > 0;
};

// Auto-translate using external API (placeholder - requires API key)
export const autoTranslateProperty = async (
  propertyId: number | string,
  sourceLocale: string,
  targetLocale: string
): Promise<PropertyTranslation | null> => {
  // Get the source translation or original property
  const [propertyRows] = await pool.execute<RowDataPacket[]>(
    'SELECT title, description FROM properties WHERE id = ?',
    [propertyId]
  );
  
  let sourceTitle = propertyRows[0]?.title;
  let sourceDescription = propertyRows[0]?.description;
  
  // Check if source locale translation exists
  const sourceTranslation = await getPropertyTranslation(propertyId, sourceLocale);
  if (sourceTranslation) {
    sourceTitle = sourceTranslation.title;
    sourceDescription = sourceTranslation.description;
  }
  
  if (!sourceTitle) return null;
  
  // TODO: Integrate with DeepL or Google Translate API
  // For now, return null to indicate auto-translation is not available
  console.log(`Auto-translation from ${sourceLocale} to ${targetLocale} not configured`);
  return null;
};
