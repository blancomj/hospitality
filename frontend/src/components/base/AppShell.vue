<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-soft sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <router-link to="/" class="flex items-center space-x-2">
            <span class="text-display text-xl text-primary-700">{{ t('common.appName') }}</span>
          </router-link>

          <!-- Navegación -->
          <nav class="hidden md:flex items-center space-x-8">
            <router-link 
              to="/" 
              class="text-gray-600 hover:text-primary-600 transition-colors"
            >
              {{ t('nav.home') }}
            </router-link>
            
            <template v-if="authStore.isAuthenticated">
              <router-link 
                :to="`/${locale}/profile`" 
                class="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {{ t('nav.profile') }}
              </router-link>
              
              <router-link 
                v-if="authStore.isHost"
                :to="`/${locale}/panel`" 
                class="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {{ t('nav.hostPanel') }}
              </router-link>
              
              <router-link 
                v-if="authStore.isAdmin"
                to="/admin" 
                class="text-gray-600 hover:text-primary-600 transition-colors"
              >
                {{ t('nav.admin') }}
              </router-link>
              
              <button 
                @click="handleLogout"
                class="btn-ghost text-sm"
              >
                {{ t('nav.logout') }}
              </button>
            </template>
            
            <template v-else>
              <button 
                @click="goToLogin"
                class="btn-primary text-sm"
              >
                {{ t('nav.login') }}
              </button>
            </template>

            <LanguageSelector />
            <CurrencySelector />
          </nav>

          <!-- Botón móvil -->
          <button 
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-lg hover:bg-cream-200"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                v-if="!mobileMenuOpen" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M4 6h16M4 12h16M4 18h16"
              />
              <path 
                v-else 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Menú móvil -->
        <div 
          v-if="mobileMenuOpen" 
          class="md:hidden py-4 border-t border-cream-200"
        >
          <nav class="flex flex-col space-y-3">
            <router-link 
              to="/" 
              @click="mobileMenuOpen = false"
              class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-cream-100"
            >
              {{ t('nav.home') }}
            </router-link>
            
            <template v-if="authStore.isAuthenticated">
              <router-link 
                :to="`/${locale}/profile`" 
                @click="mobileMenuOpen = false"
                class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-cream-100"
              >
                {{ t('nav.profile') }}
              </router-link>
              
              <router-link 
                v-if="authStore.isHost"
                :to="`/${locale}/panel`" 
                @click="mobileMenuOpen = false"
                class="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-cream-100"
              >
                {{ t('nav.hostPanel') }}
              </router-link>

              <button 
                @click="handleLogout"
                class="text-left text-gray-600 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-cream-100"
              >
                {{ t('nav.logout') }}
              </button>
            </template>
            
            <template v-else>
              <button 
                @click="goToLogin"
                class="btn-primary text-sm w-full"
              >
                {{ t('nav.login') }}
              </button>
            </template>
          </nav>
        </div>
      </div>
    </header>

    <!-- Contenido principal -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer móvil -->
    <footer class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-cream-200 px-4 py-3">
      <div class="flex justify-around items-center">
        <router-link to="/" class="flex flex-col items-center text-gray-500 hover:text-primary-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="text-xs mt-1">{{ t('nav.home') }}</span>
        </router-link>
        
        <router-link to="/search" class="flex flex-col items-center text-gray-500 hover:text-primary-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span class="text-xs mt-1">{{ t('nav.search') }}</span>
        </router-link>
        
        <router-link 
          v-if="authStore.isAuthenticated"
          to="/profile" 
          class="flex flex-col items-center text-gray-500 hover:text-primary-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-xs mt-1">{{ t('nav.profile') }}</span>
        </router-link>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LanguageSelector from '@/components/ux/LanguageSelector.vue'
import CurrencySelector from '@/components/ux/CurrencySelector.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const locale = computed(() => (route.params.locale as string) || 'es')
const mobileMenuOpen = ref(false)

const handleLogout = async () => {
  await authStore.logout()
  mobileMenuOpen.value = false
  router.push(`/${locale.value}`)
}

const goToLogin = () => {
  mobileMenuOpen.value = false
  router.push(`/${locale.value}/login`)
}
</script>
