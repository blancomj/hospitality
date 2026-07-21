import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/lib/api';
import { User, AuthResponse, ProfileResponse } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);
  const isHost = computed(() => user.value?.role === 'host' || user.value?.role === 'admin');
  const isAdmin = computed(() => user.value?.role === 'admin');

  const checkSession = async (): Promise<void> => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      isLoading.value = true;
      const response = await api.get<ProfileResponse>('/users/me');
      user.value = response.data.user;
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<User> => {
    try {
      isLoading.value = true;
      error.value = null;

      const response = await api.post<AuthResponse>('/auth/google', { idToken });
      
      const { user: userData, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      user.value = userData;
      
      return userData;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Error al iniciar sesión';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
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
      
      if (user.value) {
        user.value.role = 'host';
      }
      
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
    logout,
    updateProfile,
    becomeHost,
  };
});
