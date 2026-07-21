<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('profile.title') }}
        </h1>
        <p class="text-gray-600">
          {{ authStore.user?.email }}
        </p>
      </div>

      <!-- Card de perfil -->
      <div class="card p-6 mb-6">
        <div class="flex items-center gap-4 mb-6">
          <!-- Avatar -->
          <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            <img 
              v-if="authStore.user?.avatarUrl" 
              :src="authStore.user.avatarUrl" 
              :alt="authStore.user.fullName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-2xl text-primary-600 font-semibold">
              {{ authStore.user?.fullName?.charAt(0) || '?' }}
            </span>
          </div>
          
          <div>
            <h2 class="text-xl font-semibold text-gray-900">
              {{ authStore.user?.fullName }}
            </h2>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {{ t(`roles.${authStore.user?.role}`) }}
            </span>
          </div>
        </div>

        <!-- Formulario de perfil -->
        <form @submit.prevent="handleUpdateProfile" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.fullName') }}
            </label>
            <input
              v-model="form.fullName"
              type="text"
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.phone') }}
            </label>
            <input
              v-model="form.phone"
              type="tel"
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.locale') }}
            </label>
            <select v-model="form.locale" class="input-base">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <div class="flex justify-end">
            <AppButton 
              type="submit" 
              variant="primary"
              :loading="isUpdating"
            >
              {{ t('common.save') }}
            </AppButton>
          </div>
        </form>
      </div>

      <!-- Sección de propietario -->
      <div v-if="authStore.user?.role === 'guest'" class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ t('profile.becomeHost') }}
        </h3>
        <p class="text-gray-600 mb-4">
          ¿Tienes una propiedad que quieras administrar? Conviértete en propietario y comienza a recibir reservas.
        </p>
        
        <AppButton 
          v-if="!showHostForm"
          variant="secondary"
          @click="showHostForm = true"
        >
          {{ t('profile.becomeHost') }}
        </AppButton>

        <!-- Formulario de propietario -->
        <form 
          v-if="showHostForm" 
          @submit.prevent="handleBecomeHost" 
          class="space-y-4 mt-4 border-t border-cream-200 pt-4"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.legalName') }} *
            </label>
            <input
              v-model="hostForm.legalName"
              type="text"
              required
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.documentId') }} *
            </label>
            <input
              v-model="hostForm.documentId"
              type="text"
              required
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.bankName') }} *
            </label>
            <input
              v-model="hostForm.bankName"
              type="text"
              required
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.bankAccountNumber') }} *
            </label>
            <input
              v-model="hostForm.bankAccountNumber"
              type="text"
              required
              class="input-base"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('profile.bankAccountType') }} *
            </label>
            <select v-model="hostForm.bankAccountType" required class="input-base">
              <option value="savings">{{ t('profile.savings') }}</option>
              <option value="checking">{{ t('profile.checking') }}</option>
            </select>
          </div>

          <div class="flex justify-end gap-3">
            <AppButton 
              type="button" 
              variant="ghost"
              @click="showHostForm = false"
            >
              {{ t('common.cancel') }}
            </AppButton>
            <AppButton 
              type="submit" 
              variant="secondary"
              :loading="isCreatingHost"
            >
              {{ t('common.submit') }}
            </AppButton>
          </div>
        </form>
      </div>

      <!-- Perfil de propietario existente -->
      <div v-if="authStore.user?.role === 'host'" class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ t('profile.hostProfile') }}
        </h3>
        
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t('profile.legalName') }}:</span>
            <span class="font-medium">{{ hostProfileData?.legalName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t('profile.bankName') }}:</span>
            <span class="font-medium">{{ hostProfileData?.bankName }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">{{ t('profile.pendingApproval') }}:</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {{ hostProfileData?.approvalStatus === 'pending_approval' ? 'Pendiente' : 'Aprobado' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import AppButton from '@/components/base/AppButton.vue'
import { HostProfile } from '@/types'

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()

const form = reactive({
  fullName: authStore.user?.fullName || '',
  phone: authStore.user?.phone || '',
  locale: authStore.user?.locale || 'es',
})

const hostForm = reactive({
  legalName: '',
  documentId: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountType: 'savings' as 'savings' | 'checking',
})

const showHostForm = ref(false)
const isUpdating = ref(false)
const isCreatingHost = ref(false)
const hostProfileData = ref<HostProfile | null>(null)

const handleUpdateProfile = async () => {
  try {
    isUpdating.value = true
    await authStore.updateProfile(form)
    toast.success(t('profile.profileUpdated'))
  } catch (error: any) {
    toast.error(error.message || 'Error al actualizar perfil')
  } finally {
    isUpdating.value = false
  }
}

const handleBecomeHost = async () => {
  try {
    isCreatingHost.value = true
    await authStore.becomeHost(hostForm)
    toast.success('Perfil de propietario creado. Pendiente de aprobación.')
    showHostForm.value = false
  } catch (error: any) {
    toast.error(error.message || 'Error al crear perfil de propietario')
  } finally {
    isCreatingHost.value = false
  }
}

onMounted(async () => {
  if (authStore.user?.role === 'host' || authStore.user?.role === 'admin') {
    try {
      const response = await api.get('/users/me')
      hostProfileData.value = response.data.hostProfile
    } catch (error) {
      console.error('Error cargando perfil de propietario:', error)
    }
  }
})
</script>
