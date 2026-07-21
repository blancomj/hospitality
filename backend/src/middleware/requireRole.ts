import { Request, Response, NextFunction } from 'express';
import { UserRow } from '../types/index.js';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'No tienes permiso para realizar esta acción',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};
