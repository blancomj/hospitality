import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import pool from '../../db/connection.js';
import { JwtPayload, UserRow } from '../../types/index.js';
import { initFirebase, verifyFirebaseToken } from './firebase-admin.js';
import type { FirebaseUserInfo } from './firebase-admin.js';

export { initFirebase, verifyFirebaseToken };
export type { FirebaseUserInfo };

/**
 * NOTA: se eliminó todo el código de Google OAuth directo
 * (OAuth2Client, validateGoogleToken, upsertGoogleUser).
 *
 * Era una vía de autenticación paralela anterior a la migración a Firebase.
 * Mantenerla implicaba:
 *  - dos caminos de login que auditar y mantener sincronizados;
 *  - instanciar un OAuth2Client al cargar el módulo, lo que hacía fallar
 *    cualquier arranque (o prueba) sin GOOGLE_CLIENT_ID configurado;
 *  - depender de sp_upsert_google_user, ya reemplazado por su equivalente
 *    de Firebase.
 *
 * Hoy Google se sigue ofreciendo como método de login, pero a través de
 * Firebase Auth, no de una integración propia.
 */

export const upsertFirebaseUser = async (
  firebaseUid: string,
  email: string,
  fullName: string,
  avatarUrl: string | null
): Promise<UserRow> => {
  try {
    const [rows] = await pool.execute(
      'CALL sp_upsert_firebase_user(?, ?, ?, ?)',
      [firebaseUid, email, fullName, avatarUrl]
    );
    const result = rows as any;
    return result[0][0] as UserRow;
  } catch (err: any) {
    if (err?.errno === 1305 || err?.errno === 1064 || err?.errno === 1146) {
      console.error(
        'sp_upsert_firebase_user no existe. Ejecuta las migraciones pendientes ' +
        '(npm run migrate) antes de usar la autenticación.'
      );
      throw new Error('La base de datos no está inicializada correctamente');
    }
    throw err;
  }
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
