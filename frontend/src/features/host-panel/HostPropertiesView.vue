<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            {{ t('hostPanel.myPropertiesTitle') }}
          </h1>
          <p class="text-gray-600">{{ t('hostPanel.myPropertiesSubtitle') }}</p>
        </div>
        <router-link
          :to="`/${locale}/panel/properties/new`"
          class="btn-primary"
        >
          {{ t('hostPanel.addNewProperty') }}
        </router-link>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="h-64 skeleton rounded-2xl" />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else-if="properties.length === 0"
        :title="t('hostPanel.noProperties')"
        :description="t('hostPanel.noPropertiesDescription')"
      />

      <!-- Properties grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="property in properties"
          :key="property.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
        >
          <!-- Photo -->
          <div class="h-48 bg-gray-100 relative">
            <img
              v-if="property.main_photo_url"
              :src="property.main_photo_url"
              :alt="property.title"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              <ImageIcon class="w-12 h-12" />
            </div>
            <!-- Status badge -->
            <span
              class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium"
              :class="statusClass(property.status)"
            >
              {{ statusLabel(property.status) }}
            </span>
          </div>

          <!-- Info -->
          <div class="p-4">
            <h3 class="font-semibold text-gray-900 mb-1 truncate">{{ property.title }}</h3>
            <p class="text-sm text-gray-500 mb-3">
              {{ property.city }} · {{ t('hostPanel.propertyType') }}: {{ property.property_type || '—' }}
            </p>
            <p class="text-lg font-bold text-primary-600 mb-4">
              ${{ formatPrice(property.price_per_night) }}
              <span class="text-sm font-normal text-gray-500">/ {{ t('bookings.nights') }}</span>
            </p>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                v-if="property.status === 'draft' || property.status === 'paused'"
                @click="changeStatus(property, 'published')"
                class="flex-1 btn-primary text-sm py-2"
              >
                {{ t('hostPanel.activate') }}
              </button>
              <button
                v-if="property.status === 'published'"
                @click="changeStatus(property, 'paused')"
                class="flex-1 btn-ghost text-sm py-2 border"
              >
                {{ t('hostPanel.pause') }}
              </button>
              <router-link
                :to="`/${locale}/property/${property.id}`"
                class="btn-ghost text-sm py-2 px-3 border"
                target="_blank"
              >
                {{ t('hostPanel.edit') }}
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { ImageIcon } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()

const locale = computed(() => (route.params.locale as string) || 'es')

interface Property {
  id: number
  title: string
  city: string
  property_type: string
  price_per_night: number
  status: 'draft' | 'published' | 'paused'
  main_photo_url: string | null
}

const properties = ref<Property[]>([])
const isLoading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const statusClass = (status: string) => {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800'
    case 'paused': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'draft': return t('hostPanel.statusDraft')
    case 'published': return t('hostPanel.statusPublished')
    case 'paused': return t('hostPanel.statusPaused')
    default: return status
  }
}

const fetchProperties = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/properties/mine')
    properties.value = response.data.properties
  } catch (error) {
    console.error('Error fetching properties:', error)
    toast.error(t('toast.dashboardLoadError'))
  } finally {
    isLoading.value = false
  }
}

const changeStatus = async (property: Property, newStatus: string) => {
  try {
    await api.patch(`/properties/${property.id}/status`, { status: newStatus })
    property.status = newStatus as any
    toast.success(t('toast.profileUpdated'))
  } catch (error) {
    console.error('Error changing status:', error)
    toast.error(t('toast.genericError'))
  }
}

onMounted(() => {
  fetchProperties()
})
</script>
