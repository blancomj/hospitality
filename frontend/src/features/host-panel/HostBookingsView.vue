<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('hostPanel.propertyBookings') }}
        </h1>
        <p class="text-gray-600">{{ t('hostPanel.bookingsSubtitle') }}</p>
      </div>

      <!-- Filters -->
      <div class="flex gap-2 mb-6">
        <button
          v-for="filter in filters"
          :key="filter.value"
          @click="currentFilter = filter.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            currentFilter === filter.value
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>

      <!-- Bookings list -->
      <div v-else-if="bookings.length > 0" class="space-y-4">
        <div
          v-for="booking in bookings"
          :key="booking.booking_id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-900">{{ booking.property_title }}</h3>
              <p class="text-sm text-gray-500">{{ booking.property_city }}</p>
              <p class="text-sm text-gray-500 mt-1">
                {{ t('hostPanel.guest') }}: {{ booking.guest_name }} ({{ booking.guest_email }})
              </p>
              <p class="text-sm text-gray-500">
                {{ formatDate(booking.start_date) }} - {{ formatDate(booking.end_date) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600">
                ${{ formatPrice(booking.total_amount) }}
              </p>
              <span
                :class="[
                  'inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium',
                  getStatusClass(booking.status)
                ]"
              >
                {{ getStatusLabel(booking.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        :title="t('hostPanel.noBookingsFound')"
        :description="t('hostPanel.noBookingsDescription')"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const { t } = useI18n()
const toast = useToast()

interface Booking {
  booking_id: number
  property_id: number
  property_title: string
  property_city: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  start_date: string
  end_date: string
  guests_count: number
  total_amount: number
  status: string
  created_at: string
}

const filters = computed(() => [
  { label: t('hostPanel.allBookings'), value: '' },
  { label: t('hostPanel.upcomingBookings'), value: 'confirmed' },
  { label: t('hostPanel.completedBookings'), value: 'completed' },
  { label: t('hostPanel.cancelledBookings'), value: 'cancelled' },
])

const bookings = ref<Booking[]>([])
const isLoading = ref(true)
const currentFilter = ref('')

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO')
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    case 'cancelled': return 'bg-red-100 text-red-700'
    case 'pending_payment': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'confirmed': return t('hostPanel.confirmed')
    case 'completed': return t('hostPanel.completedBookings')
    case 'cancelled': return t('hostPanel.cancelledBookings')
    case 'pending_payment': return t('bookings.status.pending_payment')
    default: return status
  }
}

const fetchBookings = async () => {
  isLoading.value = true
  try {
    const params: any = {}
    if (currentFilter.value) params.status = currentFilter.value
    const response = await api.get('/host/bookings', { params })
    bookings.value = response.data.bookings
  } catch (error) {
    console.error('Error fetching bookings:', error)
    toast.error(t('toast.bookingsLoadError'))
  } finally {
    isLoading.value = false
  }
}

watch(currentFilter, () => {
  fetchBookings()
})

onMounted(() => {
  fetchBookings()
})
</script>
