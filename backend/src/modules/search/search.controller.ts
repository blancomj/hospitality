import { Request, Response } from 'express';
import { z } from 'zod';
import * as searchService from './search.service.js';

const searchSchema = z.object({
  city: z.string().optional(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.coerce.number().int().min(1).optional(),
  flexible: z.boolean().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  amenities: z.string().transform(val => val.split(',').map(Number)).optional(),
  type: z.enum(['apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion']).optional(),
});

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = searchSchema.parse(req.query);
    
    const properties = await searchService.searchProperties({
      city: filters.city,
      startDate: filters.start,
      endDate: filters.end,
      guests: filters.guests,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      amenities: filters.amenities,
      type: filters.type,
    });

    res.json({ 
      properties,
      count: properties.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Parámetros inválidos', details: error.errors });
      return;
    }
    console.error('Error en search:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const searchWithFilters = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = searchSchema.parse(req.query);
    
    const properties = await searchService.searchProperties({
      city: filters.city,
      startDate: filters.start,
      endDate: filters.end,
      guests: filters.guests,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      amenities: filters.amenities,
      type: filters.type,
    });

    res.json({ 
      properties,
      count: properties.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Parámetros inválidos', details: error.errors });
      return;
    }
    console.error('Error en searchWithFilters:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const searchForMap = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city } = req.query;
    const properties = await searchService.searchPropertiesForMap(city as string);
    res.json({ properties });
  } catch (error) {
    console.error('Error en searchForMap:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const cities = await searchService.getCities();
    res.json({ cities });
  } catch (error) {
    console.error('Error en getCities:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
