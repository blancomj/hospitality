import sharp from 'sharp';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'properties');
const THUMBNAIL_WIDTH = 400;
const MEDIUM_WIDTH = 800;
const FULL_WIDTH = 1200;

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export interface ProcessedImage {
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
}

export const processPropertyImage = async (
  file: Express.Multer.File,
  propertyId: number
): Promise<ProcessedImage> => {
  const propertyDir = path.join(UPLOADS_DIR, String(propertyId));
  await ensureDir(propertyDir);

  const filename = randomBytes(16).toString('hex');
  const baseName = `${filename}.webp`;

  const fullPath = path.join(propertyDir, `full_${baseName}`);
  const thumbnailPath = path.join(propertyDir, `thumb_${baseName}`);
  const mediumPath = path.join(propertyDir, `medium_${baseName}`);

  const inputBuffer = file.buffer;

  await Promise.all([
    sharp(inputBuffer)
      .resize(FULL_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(fullPath),

    sharp(inputBuffer)
      .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbnailPath),

    sharp(inputBuffer)
      .resize(MEDIUM_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(mediumPath),
  ]);

  const baseUrl = `/uploads/properties/${propertyId}`;

  return {
    url: `${baseUrl}/full_${baseName}`,
    thumbnailUrl: `${baseUrl}/thumb_${baseName}`,
    mediumUrl: `${baseUrl}/medium_${baseName}`,
  };
};

export const deletePropertyImages = async (propertyId: number): Promise<void> => {
  const propertyDir = path.join(UPLOADS_DIR, String(propertyId));
  try {
    await fs.rm(propertyDir, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
};

export const deleteSingleImage = async (imageUrl: string): Promise<void> => {
  const filePath = path.join(process.cwd(), imageUrl);
  try {
    await fs.unlink(filePath);
    // Also delete thumbnail and medium versions
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath).replace('full_', '');
    await Promise.allSettled([
      fs.unlink(path.join(dir, `thumb_${basename}`)),
      fs.unlink(path.join(dir, `medium_${basename}`)),
    ]);
  } catch {
    // File might not exist
  }
};
