<template>
  <AppShell>
    <div class="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4">
      <!-- Hero section -->
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h1 class="text-4xl md:text-5xl font-serif text-primary-700 mb-4">
          {{ t('auth.loginTitle') }}
        </h1>
        <p class="text-lg text-gray-600">
          {{ t('auth.loginSubtitle') }}
        </p>
      </div>

      <!-- Card de login -->
      <div class="w-full max-w-md">
        <div class="card p-8">
          <!-- Botón de Google -->
          <div ref="googleButtonRef" id="g_id_onload"
               :data-client_id="googleClientId"
               data-callback="handleGoogleCredential"
               data-auto_prompt="false">
          </div>
          
          <button
            @click="handleGoogleLogin"
            :disabled="authStore.isLoading"
            class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <!-- Google icon -->
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            
            <span v-if="authStore.isLoading">
              {{ t('common.loading') }}
            </span>
            <span v-else>
              {{ t('auth.googleLogin') }}
            </span>
          </button>

          <!-- Error message -->
          <div 
            v-if="authStore.error" 
            class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          >
            {{ authStore.error }}
          </div>

          <!-- Términos -->
          <p class="mt-6 text-xs text-center text-gray-500">
            Al continuar, aceptas nuestros 
            <a href="#" class="text-primary-600 hover:underline">Términos de Servicio</a> 
            y 
            <a href="#" class="text-primary-600 hover:underline">Política de Privacidad</a>
          </p>
        </div>

        <!-- Tagline -->
        <p class="text-center text-sm text-gray-500 mt-6">
          {{ t('common.tagline') }}
        </p>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const locale = computed(() => (route.params.locale as string) || 'es')
const googleButtonRef = ref<HTMLElement | null>(null)
const googleClientId = computed(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '')

const handleGoogleLogin = async () => {
  alert('Para usar el login con Google, necesitas configurar GOOGLE_CLIENT_ID en el archivo .env del frontend')
}

const handleGoogleCredential = async (response: { credential: string }) => {
  try {
    await authStore.loginWithGoogle(response.credential)
    router.push(`/${locale.value}/profile`)
  } catch (error) {
    console.error('Error en login:', error)
  }
}

onMounted(() => {
  ;(window as any).handleGoogleCredential = handleGoogleCredential
  
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
})
</script>
