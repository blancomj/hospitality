import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import pool from '../db/connection.js';
import { JwtPayload, UserRow } from '../types/index.js';

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'MISSING_TOKEN' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret!) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED' 
        });
        return;
      }
      res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN' 
      });
      return;
    }

    const [rows] = await pool.execute<UserRow[]>(
      'SELECT id, google_id, email, full_name, avatar_url, role, phone, locale, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND' 
      });
      return;
    }

    const user = rows[0];

    if (user.status === 'suspended') {
      res.status(403).json({ 
        error: 'Cuenta suspendida',
        code: 'ACCOUNT_SUSPENDED' 
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret!) as JwtPayload;
      
      const [rows] = await pool.execute<UserRow[]>(
        'SELECT id, google_id, email, full_name, avatar_url, role, phone, locale, status FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (rows.length > 0 && rows[0].status === 'active') {
        req.user = rows[0];
      }
    } catch (err) {
      // Token inválido o expirado, continúa sin usuario
    }
    
    next();
  } catch (error) {
    next();
  }
};
