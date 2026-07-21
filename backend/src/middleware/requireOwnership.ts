import { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { RowDataPacket } from 'mysql2';

export const requireOwnership = (paramName: string, table: string, ownerColumn: string = 'host_id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ 
          error: 'Autenticación requerida',
          code: 'AUTH_REQUIRED' 
        });
        return;
      }

      if (req.user.role === 'admin') {
        next();
        return;
      }

      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        res.status(400).json({ 
          error: 'ID de recurso no proporcionado',
          code: 'MISSING_RESOURCE_ID' 
        });
        return;
      }

      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT ${ownerColumn} FROM ${table} WHERE id = ?`,
        [resourceId]
      );

      if (rows.length === 0) {
        res.status(404).json({ 
          error: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND' 
        });
        return;
      }

      if (rows[0][ownerColumn] !== req.user.id) {
        res.status(403).json({ 
          error: 'No eres dueño de este recurso',
          code: 'NOT_OWNER' 
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error en middleware de propiedad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

export const requireBookingOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED' 
      });
      return;
    }

    if (req.user.role === 'admin') {
      next();
      return;
    }

    const bookingId = req.params.id;
    
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.guest_id, p.host_id 
       FROM bookings b 
       JOIN properties p ON b.property_id = p.id 
       WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      res.status(404).json({ 
        error: 'Reserva no encontrada',
        code: 'BOOKING_NOT_FOUND' 
      });
      return;
    }

    const { guest_id, host_id } = rows[0] as { guest_id: number; host_id: number };
    
    if (req.user.id !== guest_id && req.user.id !== host_id) {
      res.status(403).json({ 
        error: 'No tienes acceso a esta reserva',
        code: 'NOT_BOOKING_OWNER' 
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error en middleware de propiedad de reserva:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
