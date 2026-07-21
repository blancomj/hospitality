import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import pool from '../../db/connection.js';
import { UserRow } from '../../types/index.js';

const googleLoginSchema = z.object({
  idToken: z.string().min(1, 'El id_token de Google es requerido'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = googleLoginSchema.parse(req.body);

    const googleUser = await authService.validateGoogleToken(idToken);

    const user = await authService.upsertGoogleUser(
      googleUser.googleId,
      googleUser.email,
      googleUser.fullName,
      googleUser.avatarUrl
    );

    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        locale: user.locale,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors,
      });
      return;
    }

    console.error('Error en googleLogin:', error);
    res.status(401).json({
      error: (error as Error).message || 'Error al autenticar con Google',
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = refreshSchema.parse(req.body);

    const decoded = authService.verifyRefreshToken(token);

    const [rows] = await pool.execute<UserRow[]>(
      'SELECT id, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (rows[0].status === 'suspended') {
      res.status(403).json({ error: 'Cuenta suspendida' });
      return;
    }

    const accessToken = authService.generateAccessToken(rows[0].id);

    res.json({ accessToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors,
      });
      return;
    }

    if ((error as any).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Refresh token expirado' });
      return;
    }

    if ((error as any).name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Refresh token inválido' });
      return;
    }

    console.error('Error en refreshToken:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Sesión cerrada correctamente' });
};
