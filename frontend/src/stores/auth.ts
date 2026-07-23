import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import api from '@/lib/api';
import { auth, googleProvider, EMAIL_FOR_SIGNIN_KEY } from '@/lib/firebase';
import { User, AuthResponse, ProfileResponse } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isHost = computed(() => user.value?.role === 'host' || user.value?.role === 'admin');
  const isAdmin = computed(() => user.value?.role === 'admin');

  /**
   * Intercambia el ID token de Firebase por el JWT propio del backend.
   * Este es el único punto de contacto con el backend para el login.
   */
  const exchangeFirebaseToken = async (firebaseUser: FirebaseUser): Promise<User> => {
    const idToken = await firebaseUser.getIdToken();

    const response = await api.post<AuthResponse>('/auth/firebase', { idToken });
    const { user: userData, accessToken, refreshToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    user.value = userData;

    return userData;
  };

  const mapFirebaseError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos';
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado. Inicia sesión.';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/invalid-email':
        return 'Correo electrónico inválido';
      case 'auth/popup-closed-by-user':
        return 'Ventana de Google cerrada antes de completar';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde.';
      default:
        return err?.response?.data?.error || 'Error al iniciar sesión';
    }
  };

  const checkSession = async (): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      isLoading.value = true;
      const response = await api.get<ProfileResponse>('/users/me');
      user.value = response.data.user;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Google ---
  const loginWithGoogle = async (): Promise<User> => {
    try {
      isLoading.value = true;
      error.value = null;
      const result = await signInWithPopup(auth, googleProvider);
      return await exchangeFirebaseToken(result.user);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Correo + contraseña: iniciar sesión ---
  const loginWithEmail = async (email: string, password: string): Promise<User> => {
    try {
      isLoading.value = true;
      error.value = null;
      const result = await signInWithEmailAndPassword(auth, email, password);
      return await exchangeFirebaseToken(result.user);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Correo + contraseña: registro ---
  const registerWithEmail = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<User> => {
    try {
      isLoading.value = true;
      error.value = null;
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (fullName) {
        await updateFirebaseProfile(result.user, { displayName: fullName });
        await result.user.reload();
      }
      return await exchangeFirebaseToken(auth.currentUser as FirebaseUser);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Magic link: enviar enlace ---
  const sendMagicLink = async (email: string): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;
      const actionCodeSettings = {
        url: `${window.location.origin}/es/login`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Completa el login por magic link si la URL actual es un enlace de acceso.
   * Se debe llamar al montar la vista de login.
   * Devuelve el usuario si completó, o null si la URL no era un magic link.
   */
  const completeMagicLink = async (): Promise<User | null> => {
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      return null;
    }
    try {
      isLoading.value = true;
      error.value = null;
      let email = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
      if (!email) {
        // El enlace se abrió en otro dispositivo; pedir el correo de nuevo.
        email = window.prompt('Confirma tu correo para completar el acceso') || '';
      }
      if (!email) return null;

      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
      return await exchangeFirebaseToken(result.user);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // --- Recuperación de contraseña ---
  const resetPassword = async (email: string): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      error.value = mapFirebaseError(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      await api.post('/auth/logout');
    } catch {
      // Ignorar errores al cerrar sesión
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      user.value = null;
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<User> => {
    try {
      isLoading.value = true;
      const response = await api.patch<{ user: User }>('/users/me', data);
      user.value = response.data.user;
      return response.data.user;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Error al actualizar perfil';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const becomeHost = async (data: {
    legalName: string;
    documentId: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountType: 'savings' | 'checking';
  }): Promise<any> => {
    try {
      isLoading.value = true;
      const response = await api.post('/users/me/become-host', data);
      if (user.value) user.value.role = 'host';
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Error al crear perfil de propietario';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isHost,
    isAdmin,
    checkSession,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendMagicLink,
    completeMagicLink,
    resetPassword,
    logout,
    updateProfile,
    becomeHost,
  };
});
