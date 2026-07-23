<template>
  <AppShell>
    <div class="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      <div class="text-center max-w-2xl mx-auto mb-8">
        <h1 class="text-4xl md:text-5xl text-display text-primary-700 mb-3">
          {{ mode === 'register' ? t('auth.registerTitle') : t('auth.loginTitle') }}
        </h1>
        <p class="text-lg text-gray-600">
          {{ mode === 'register' ? t('auth.registerSubtitle') : t('auth.loginSubtitle') }}
        </p>
      </div>

      <div class="w-full max-w-md">
        <div class="card p-8">
          <!-- Botón de Google -->
          <button
            @click="handleGoogle"
            :disabled="authStore.isLoading"
            class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-cream-300 rounded-xl font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{{ t('auth.googleLogin') }}</span>
          </button>

          <!-- Separador -->
          <div class="flex items-center gap-3 my-6">
            <div class="flex-1 h-px bg-cream-300" />
            <span class="text-sm text-gray-400">{{ t('auth.or') }}</span>
            <div class="flex-1 h-px bg-cream-300" />
          </div>

          <!-- Magic link enviado: confirmación -->
          <div v-if="magicLinkSent" class="text-center py-4">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-gray-700 font-medium">{{ t('auth.magicLinkSent') }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ email }}</p>
            <button @click="magicLinkSent = false" class="btn-ghost text-sm mt-4">
              {{ t('auth.back') }}
            </button>
          </div>

          <!-- Formulario de correo -->
          <form v-else @submit.prevent="handleEmailSubmit" class="space-y-4">
            <div v-if="mode === 'register'">
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.fullName') }}</label>
              <input v-model="fullName" type="text" class="input-base" :placeholder="t('auth.fullNamePlaceholder')" required />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('auth.email') }}</label>
              <input v-model="email" type="email" class="input-base" placeholder="tu@correo.com" required />
            </div>

            <div v-if="method === 'password'">
              <div class="flex items-center justify-between mb-1">
                <label class="block text-sm font-medium text-gray-700">{{ t('auth.password') }}</label>
                <a v-if="mode === 'login'" href="#" @click.prevent="handleReset" class="text-xs text-primary-600 hover:underline">
                  {{ t('auth.forgotPassword') }}
                </a>
              </div>
              <input v-model="password" type="password" class="input-base" placeholder="••••••••" required minlength="6" />
            </div>

            <button type="submit" :disabled="authStore.isLoading" class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              <span v-if="authStore.isLoading">{{ t('common.loading') }}</span>
              <span v-else-if="method === 'magic'">{{ t('auth.sendMagicLink') }}</span>
              <span v-else-if="mode === 'register'">{{ t('auth.registerButton') }}</span>
              <span v-else>{{ t('auth.loginButton') }}</span>
            </button>

            <!-- Alternar método correo: contraseña <-> magic link -->
            <button type="button" @click="toggleMethod" class="w-full text-center text-sm text-gray-500 hover:text-primary-600 transition-colors">
              {{ method === 'password' ? t('auth.useMagicLink') : t('auth.usePassword') }}
            </button>
          </form>

          <!-- Error -->
          <div v-if="authStore.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {{ authStore.error }}
          </div>

          <!-- Alternar login <-> registro -->
          <div v-if="!magicLinkSent" class="mt-6 text-sm text-center text-gray-600">
            {{ mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount') }}
            <button type="button" @click="toggleMode" class="text-primary-600 font-medium hover:underline ml-1 cursor-pointer">
              {{ mode === 'login' ? t('auth.registerButton') : t('auth.loginButton') }}
            </button>
          </div>

          <p class="mt-6 text-xs text-center text-gray-500">
            {{ t('auth.terms') }}
          </p>
        </div>

        <p class="text-center text-sm text-gray-500 mt-6">
          {{ t('common.tagline') }}
        </p>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/auth';
import AppShell from '@/components/base/AppShell.vue';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const authStore = useAuthStore();

const locale = computed(() => (route.params.locale as string) || 'es');
const redirectTo = computed(() => (route.query.redirect as string) || `/${locale.value}/profile`);

const mode = ref<'login' | 'register'>('login');
const method = ref<'password' | 'magic'>('password');
const email = ref('');
const password = ref('');
const fullName = ref('');
const magicLinkSent = ref(false);

const goAfterLogin = () => router.push(redirectTo.value);

const handleGoogle = async () => {
  try {
    await authStore.loginWithGoogle();
    goAfterLogin();
  } catch { /* error mostrado en el store */ }
};

const handleEmailSubmit = async () => {
  try {
    if (method.value === 'magic') {
      await authStore.sendMagicLink(email.value);
      magicLinkSent.value = true;
      return;
    }
    if (mode.value === 'register') {
      await authStore.registerWithEmail(email.value, password.value, fullName.value);
    } else {
      await authStore.loginWithEmail(email.value, password.value);
    }
    goAfterLogin();
  } catch { /* error mostrado en el store */ }
};

const handleReset = async () => {
  if (!email.value || !email.value.trim()) {
    toast.warning(t('auth.enterEmailFirst'));
    return;
  }
  try {
    await authStore.resetPassword(email.value);
    toast.success(t('auth.resetSent'));
  } catch { /* error mostrado en el store */ }
};

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  authStore.error = null;
};

const toggleMethod = () => {
  method.value = method.value === 'password' ? 'magic' : 'password';
  authStore.error = null;
};

// Al montar, completar el magic link si la URL lo es
onMounted(async () => {
  try {
    const completed = await authStore.completeMagicLink();
    if (completed) {
      toast.success(t('auth.welcomeBack'));
      goAfterLogin();
    }
  } catch { /* error mostrado en el store */ }
});
</script>
