import { OAuth2Client } from 'google-auth-library';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import pool from '../../db/connection.js';
import { GoogleUserInfo, JwtPayload, UserRow } from '../../types/index.js';

const googleClient = new OAuth2Client(config.google.clientId);

export const validateGoogleToken = async (idToken: string): Promise<GoogleUserInfo> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    
    return {
      googleId: payload!.sub,
      email: payload!.email!,
      fullName: payload!.name || '',
      avatarUrl: payload!.picture || null,
      emailVerified: payload!.email_verified || false,
    };
  } catch (error) {
    console.error('Error validando token de Google:', error);
    throw new Error('Token de Google inválido');
  }
};

export const upsertGoogleUser = async (
  googleId: string,
  email: string,
  fullName: string,
  avatarUrl: string | null
): Promise<UserRow> => {
  const [rows] = await pool.execute(
    'CALL sp_upsert_google_user(?, ?, ?, ?)',
    [googleId, email, fullName, avatarUrl]
  );

  const result = rows as any;
  const user = result[0][0] as UserRow;
  return user;
};

export const generateAccessToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    config.jwt.accessSecret!,
    { expiresIn: config.jwt.accessExpires } as SignOptions
  );
};

export const generateRefreshToken = (userId: number): string => {
  return jwt.sign(
    { userId },
    config.jwt.refreshSecret!,
    { expiresIn: config.jwt.refreshExpires } as SignOptions
  );
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret!) as JwtPayload;
};
