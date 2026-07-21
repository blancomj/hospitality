<template>
  <AppShell>
    <div v-if="isLoading" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Skeleton -->
      <div class="h-8 w-64 skeleton mb-4" />
      <div class="h-4 w-96 skeleton mb-8" />
      <div class="aspect-[2/1] skeleton rounded-2xl mb-8" />
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-8">
          <div class="h-64 skeleton rounded-2xl" />
          <div class="h-48 skeleton rounded-2xl" />
        </div>
        <div class="h-96 skeleton rounded-2xl" />
      </div>
    </div>

    <div v-else-if="property" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">{{ property.title }}</h1>
        <div class="flex items-center gap-4 text-gray-600">
          <div v-if="property.avg_rating > 0" class="flex items-center gap-1">
            <svg class="w-5 h-5 text-gold-400 fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span class="font-medium">{{ property.avg_rating.toFixed(1) }}</span>
            <span>({{ property.review_count }} {{ property.review_count === 1 ? t('property.review') : t('property.reviews') }})</span>
          </div>
          <span>{{ property.city }}, {{ property.neighborhood }}</span>
        </div>
      </div>

      <!-- Galería -->
      <PropertyGallery 
        :photos="property.photos" 
        :videos="property.videos"
        :alt="property.title"
        class="mb-8"
      />

      <!-- Contenido principal -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Columna izquierda -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Info del anfitrión -->
          <div class="flex items-center gap-4 pb-6 border-b border-cream-200">
            <div class="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              <img 
                v-if="property.host_avatar" 
                :src="property.host_avatar" 
                :alt="property.host_name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-xl text-primary-600 font-semibold">
                {{ property.host_name?.charAt(0) || '?' }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ t('property.host') }}: {{ property.host_name }}</p>
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span v-if="property.host_id_verified" class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ t('property.verified') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Capacidad -->
          <div class="flex items-center gap-6 text-gray-700">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{{ property.max_guests }} {{ property.max_guests === 1 ? t('property.guest') : t('property.guests') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>{{ property.bedrooms }} {{ property.bedrooms === 1 ? t('property.bedroom') : t('property.bedrooms') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>{{ property.beds }} {{ property.beds === 1 ? t('property.bed') : t('property.beds') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              <span>{{ property.bathrooms }} {{ property.bathrooms === 1 ? t('property.bathroom') : t('property.bathrooms') }}</span>
            </div>
          </div>

          <!-- Descripción -->
          <div class="prose max-w-none">
            <p class="text-gray-700 whitespace-pre-line">{{ property.description }}</p>
          </div>

          <!-- Amenidades -->
          <AmenitiesSection :amenities="property.amenities" />

          <!-- Mapa -->
          <PropertyMap 
            :latitude="Number(property.latitude)" 
            :longitude="Number(property.longitude)"
            :neighborhood="property.neighborhood || undefined"
            :address="property.address || undefined"
            :directions-note="property.directions_note || undefined"
            :area-note="property.area_note || undefined"
            :show-exact-location="property.show_exact_location"
          />
        </div>

        <!-- Columna derecha - Barra de reserva sticky -->
        <div class="lg:col-span-1">
          <div class="sticky top-24 bg-white rounded-2xl shadow-soft border border-cream-200 p-6">
            <!-- Precio -->
            <div class="flex items-baseline gap-2 mb-6">
              <span class="text-3xl font-bold text-gray-900">{{ formatPrice(property.base_price_per_night) }}</span>
              <span class="text-gray-500">{{ t('property.perNight') }}</span>
            </div>

            <!-- Calendario -->
            <AvailabilityCalendar 
              :availability="availability"
              :start-date="bookingDates.startDate"
              :end-date="bookingDates.endDate"
              @select-date="handleDateSelect"
              class="mb-6"
            />

            <!-- Botón de reserva -->
            <button 
              class="w-full py-3 bg-accent-700 hover:bg-accent-800 text-white font-medium rounded-xl transition-colors"
            >
              {{ t('property.reserve') }}
            </button>

            <!-- Desglose -->
            <div v-if="bookingDates.startDate && bookingDates.endDate" class="mt-4 space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">{{ formatPrice(property.base_price_per_night) }} x {{ nights }} {{ nights === 1 ? t('property.night') : t('property.nights') }}</span>
                <span class="text-gray-900">{{ formatPrice(property.base_price_per_night * nights) }}</span>
              </div>
              <div class="flex justify-between font-medium text-lg pt-3 border-t border-cream-200">
                <span>{{ t('property.total') }}</span>
                <span>{{ formatPrice(property.base_price_per_night * nights) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState 
      v-else
      :title="t('property.notFound')"
      :description="t('property.notFoundDescription')"
    >
      <template #action>
        <button @click="$router.push(`/${locale}/search`)" class="btn-primary">
          {{ t('common.back') }}
        </button>
      </template>
    </EmptyState>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import PropertyGallery from '@/components/property/PropertyGallery.vue'
import PropertyMap from '@/components/property/PropertyMap.vue'
import AmenitiesSection from '@/components/property/AmenitiesSection.vue'
import AvailabilityCalendar from '@/components/property/AvailabilityCalendar.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { useCurrency } from '@/composables/useCurrency'
import { Property } from '@/types'

interface Availability {
  overrides: any[]
  bookings: any[]
}

const route = useRoute()
const { t } = useI18n()
const { formatPrice } = useCurrency()

const locale = computed(() => (route.params.locale as string) || 'es')
const property = ref<Property | null>(null)
const availability = ref<Availability>({ overrides: [], bookings: [] })
const isLoading = ref(true)

const bookingDates = ref({
  startDate: null as string | null,
  endDate: null as string | null,
})

const nights = computed(() => {
  if (!bookingDates.value.startDate || !bookingDates.value.endDate) return 0
  const start = new Date(bookingDates.value.startDate)
  const end = new Date(bookingDates.value.endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
})

const handleDateSelect = ({ startDate, endDate }: { startDate: string; endDate: string }) => {
  bookingDates.value = { startDate, endDate }
}

onMounted(async () => {
  try {
    const propertyId = route.params.id

    const propResponse = await api.get(`/properties/${propertyId}?locale=${locale.value}`)
    property.value = propResponse.data.property

    const month = new Date().toISOString().substring(0, 7)
    const availResponse = await api.get(`/properties/${propertyId}/availability?month=${month}`)
    availability.value = availResponse.data
  } catch (error) {
    console.error('Error loading property:', error)
    property.value = null
  } finally {
    isLoading.value = false
  }
})
</script>
