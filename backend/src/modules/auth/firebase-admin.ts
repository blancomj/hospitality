import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { config } from '../../config/index.js';

let app: App | undefined;

export const initFirebase = (): void => {
  if (app || getApps().length > 0) {
    app = app || getApps()[0];
    return;
  }

  const { projectId, clientEmail, privateKey } = config.firebase;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin no está configurado. Faltan FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en las variables de entorno.'
    );
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
};

export interface FirebaseUserInfo {
  firebaseUid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

export const verifyFirebaseToken = async (idToken: string): Promise<FirebaseUserInfo> => {
  initFirebase();

  const decoded: DecodedIdToken = await getAuth().verifyIdToken(idToken);

  return {
    firebaseUid: decoded.uid,
    email: decoded.email || '',
    fullName: (decoded.name as string) || '',
    avatarUrl: (decoded.picture as string) || null,
    emailVerified: decoded.email_verified === true,
  };
};
