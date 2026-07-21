import { Request, Response } from 'express';
import { z } from 'zod';
import * as propertiesService from './properties.service.js';
import { processPropertyImage } from './image-processor.service.js';
import { addImageJob } from '../queue/queue.service.js';
import { Property } from '../../types/index.js';

const createPropertySchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().optional(),
  city: z.string().min(1).max(100),
  address: z.string().max(255).optional(),
  neighborhood: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  showExactLocation: z.boolean().optional(),
  directionsNote: z.string().optional(),
  areaNote: z.string().optional(),
  propertyType: z.enum(['apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion']),
  maxGuests: z.number().int().min(1).max(50).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  beds: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  areaM2: z.number().int().min(1).optional(),
  basePricePerNight: z.number().positive(),
  cancellationPolicy: z.enum(['flexible', 'moderada', 'estricta']).optional(),
});

const updatePropertySchema = createPropertySchema.partial();

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(255).optional(),
  neighborhood: z.string().max(100).optional(),
  showExactLocation: z.boolean().optional(),
  directionsNote: z.string().optional(),
  areaNote: z.string().optional(),
});

const updateAmenitiesSchema = z.object({
  amenities: z.array(z.object({
    amenityId: z.number().int(),
    detail: z.string().max(120).nullable().optional(),
  })),
});

const updateAvailabilitySchema = z.object({
  overrides: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isBlocked: z.boolean().optional(),
    specialPrice: z.number().positive().nullable().optional(),
  })),
});

export const getMyProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const properties = await propertiesService.getPropertiesByHost(req.user!.id);
    res.json({ properties });
  } catch (error) {
    console.error('Error en getMyProperties:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const locale = (req.query.locale as string) || 'es';

    const property = await propertiesService.getPropertyById(id, locale);

    if (!property) {
      res.status(404).json({ error: 'Propiedad no encontrada' });
      return;
    }

    if (property.status === 'draft' && property.hostId !== req.user?.id) {
      res.status(404).json({ error: 'Propiedad no encontrada' });
      return;
    }

    res.json({ property });
  } catch (error) {
    console.error('Error en getProperty:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = createPropertySchema.parse(req.body);
    const property = await propertiesService.createProperty(req.user!.id, data);
    res.status(201).json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en createProperty:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = updatePropertySchema.parse(req.body);

    const property = await propertiesService.updateProperty(id, req.user!.id, data);
    res.json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en updateProperty:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updatePropertyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = z.object({ status: z.enum(['draft', 'published', 'paused']) }).parse(req.body);

    const property = await propertiesService.updateProperty(id, req.user!.id, { status });
    res.json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en updatePropertyStatus:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    await propertiesService.deleteProperty(id, req.user!.id);
    res.json({ message: 'Propiedad eliminada' });
  } catch (error) {
    console.error('Error en deleteProperty:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const addPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (req.file) {
      // Process image with sharp
      const processed = await processPropertyImage(req.file, parseInt(id));
      const photo = await propertiesService.addPropertyPhoto(
        id, 
        req.user!.id, 
        processed.url, 
        processed.thumbnailUrl, 
        0
      );
      res.status(201).json({ photo });
    } else {
      // Legacy: accept URL directly
      const { url, thumbnailUrl, sortOrder } = req.body;
      const photo = await propertiesService.addPropertyPhoto(id, req.user!.id, url, thumbnailUrl, sortOrder);
      res.status(201).json({ photo });
    }
  } catch (error) {
    console.error('Error en addPhoto:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};

export const deletePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const photoId = req.params.photoId as string;
    const deleted = await propertiesService.deletePropertyPhoto(photoId, id, req.user!.id);

    if (!deleted) {
      res.status(404).json({ error: 'Foto no encontrada' });
      return;
    }

    res.json({ message: 'Foto eliminada' });
  } catch (error) {
    console.error('Error en deletePhoto:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};

export const reorderPhotos = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds)) {
      res.status(400).json({ error: 'photoIds debe ser un array' });
      return;
    }

    await propertiesService.reorderPropertyPhotos(id, req.user!.id, photoIds);
    res.json({ message: 'Fotos reordenadas' });
  } catch (error) {
    console.error('Error en reorderPhotos:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};

export const addVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { source, url, thumbnailUrl } = req.body;

    const video = await propertiesService.addPropertyVideo(id, req.user!.id, source, url, thumbnailUrl);
    res.status(201).json({ video });
  } catch (error) {
    console.error('Error en addVideo:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};

export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const videoId = req.params.videoId as string;
    const deleted = await propertiesService.deletePropertyVideo(videoId, id, req.user!.id);

    if (!deleted) {
      res.status(404).json({ error: 'Video no encontrado' });
      return;
    }

    res.json({ message: 'Video eliminado' });
  } catch (error) {
    console.error('Error en deleteVideo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = updateLocationSchema.parse(req.body);

    const property = await propertiesService.updatePropertyLocation(id, req.user!.id, data);
    res.json({ property });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en updateLocation:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getAmenities = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const amenities = await propertiesService.getPropertyAmenities(id);
    res.json({ amenities });
  } catch (error) {
    console.error('Error en getAmenities:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateAmenities = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { amenities } = updateAmenitiesSchema.parse(req.body);

    const updated = await propertiesService.updatePropertyAmenities(id, req.user!.id, amenities);
    res.json({ amenities: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en updateAmenities:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};

export const getAmenityCatalog = async (req: Request, res: Response): Promise<void> => {
  try {
    const catalog = await propertiesService.getAmenityCatalog();
    res.json({ catalog });
  } catch (error) {
    console.error('Error en getAmenityCatalog:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

    const availability = await propertiesService.getPropertyAvailability(id, month);
    res.json(availability);
  } catch (error) {
    console.error('Error en getAvailability:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updateAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { overrides } = updateAvailabilitySchema.parse(req.body);

    const availability = await propertiesService.updatePropertyAvailability(id, req.user!.id, overrides);
    res.json(availability);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', details: error.errors });
      return;
    }
    console.error('Error en updateAvailability:', error);
    res.status(500).json({ error: (error as Error).message || 'Error interno del servidor' });
  }
};
