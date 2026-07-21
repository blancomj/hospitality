<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('admin.platformSettingsTitle') }}
        </h1>
        <p class="text-gray-600">{{ t('admin.platformSettingsSubtitle') }}</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <!-- Settings -->
      <div v-else class="space-y-4">
        <div
          v-for="setting in settings"
          :key="setting.setting_key"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{{ formatKey(setting.setting_key) }}</h3>
              <p class="text-sm text-gray-500">{{ t('admin.lastUpdated') }}: {{ formatDate(setting.updated_at) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="editedValues[setting.setting_key]"
                :type="getInputType(setting.value_type)"
                class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-64"
              />
              <button
                @click="saveSetting(setting.setting_key)"
                :disabled="editedValues[setting.setting_key] === setting.setting_value"
                class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const toast = useToast()

interface Setting {
  setting_key: string
  setting_value: string
  value_type: string
  updated_at: string
}

const settings = ref<Setting[]>([])
const editedValues = reactive<Record<string, string>>({})
const isLoading = ref(true)

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatKey = (key: string) => {
  const labels: Record<string, string> = {
    default_commission_rate: 'Tasa de comisión global (%)',
    booking_expiry_minutes: 'Tiempo de expiración de reserva (minutos)',
    cancellation_policies: 'Políticas de cancelación disponibles',
    enabled_cities: 'Ciudades habilitadas',
    min_booking_nights: 'Mínimo de noches por reserva',
    max_booking_nights: 'Máximo de noches por reserva',
  }
  return labels[key] || key
}

const getInputType = (type: string) => {
  switch (type) {
    case 'int':
    case 'decimal':
      return 'number'
    default:
      return 'text'
  }
}

const fetchSettings = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/admin/settings')
    settings.value = response.data.settings
    settings.value.forEach(s => {
      editedValues[s.setting_key] = s.setting_value
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    toast.error(t('toast.settingsLoadError'))
  } finally {
    isLoading.value = false
  }
}

const saveSetting = async (key: string) => {
  try {
    await api.put(`/admin/settings/${key}`, {
      value: editedValues[key]
    })
    toast.success(t('toast.settingsUpdated'))
  } catch (error) {
    console.error('Error saving setting:', error)
    toast.error(t('toast.settingsSaveError'))
  }
}

onMounted(() => {
  fetchSettings()
})
</script>
