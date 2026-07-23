import { OAuth2Client } from 'google-auth-library';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/index.js';
import pool from '../../db/connection.js';
import { GoogleUserInfo, JwtPayload, UserRow } from '../../types/index.js';
import { initFirebase, verifyFirebaseToken } from './firebase-admin.js';
import type { FirebaseUserInfo } from './firebase-admin.js';

export { initFirebase, verifyFirebaseToken };
export type { FirebaseUserInfo };

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

let firebaseUidAvailable: boolean | null = null;

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
    if (err?.errno === 1064 || err?.errno === 1146) {
      // SP doesn't exist yet — fallback to inline SQL
      return await upsertFirebaseUserFallback(firebaseUid, email, fullName, avatarUrl);
    }
    throw err;
  }
};

async function upsertFirebaseUserFallback(
  firebaseUid: string,
  email: string,
  fullName: string,
  avatarUrl: string | null
): Promise<UserRow> {
  const [existing] = await pool.execute<UserRow[]>(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email]
  );

  const rows = existing as UserRow[];

  if (rows.length > 0) {
    await pool.execute(
      `UPDATE users SET full_name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [fullName, avatarUrl, rows[0].id]
    );
    const [updated] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = ?', [rows[0].id]);
    return (updated as UserRow[])[0];
  }

  await pool.execute(
    `INSERT INTO users (email, full_name, avatar_url, role) VALUES (?, ?, ?, 'guest')`,
    [email, fullName, avatarUrl]
  );
  const [newUser] = await pool.execute<UserRow[]>('SELECT * FROM users WHERE id = LAST_INSERT_ID()');
  return (newUser as UserRow[])[0];
}
