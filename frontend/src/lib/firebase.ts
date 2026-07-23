import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

/**
 * Configuración de Firebase (claves públicas — pueden ir en el bundle del
 * cliente sin riesgo; la seguridad real está en las reglas de Firebase y en
 * la verificación del ID token en el backend).
 *
 * Todas las variables se leen del .env del frontend (prefijo VITE_).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Mantener la sesión de Firebase entre recargas del navegador.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('No se pudo configurar la persistencia de Firebase:', err);
});

// Clave usada para recordar el email cuando se completa el magic link.
export const EMAIL_FOR_SIGNIN_KEY = 'emailForSignIn';
