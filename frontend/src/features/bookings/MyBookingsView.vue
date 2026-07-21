<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('bookings.myBookings') }}
        </h1>
        <p class="text-gray-600">
          {{ t('bookings.myBookingsDescription') }}
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-4 mb-6 border-b border-cream-200">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.value 
            ? 'border-primary-500 text-primary-700' 
            : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span v-if="getTabCount(tab.value) > 0" class="ml-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
            {{ getTabCount(tab.value) }}
          </span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="h-48 skeleton rounded-2xl" />
      </div>

      <!-- Bookings list -->
      <div v-else-if="filteredBookings.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BookingCard
          v-for="booking in filteredBookings"
          :key="booking.booking_id"
          :booking="booking"
          @cancel="handleCancelBooking"
        />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        :title="t('bookings.noBookings')"
        :description="t('bookings.noBookingsDescription')"
      >
        <template #action>
          <button @click="$router.push(`/${locale}/search`)" class="btn-primary">
            {{ t('bookings.explore') }}
          </button>
        </template>
      </EmptyState>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import BookingCard from './BookingCard.vue'
import { Booking } from '@/types'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()

const locale = computed(() => (route.params.locale as string) || 'es')
const bookings = ref<Booking[]>([])
const isLoading = ref(true)
const activeTab = ref('upcoming')

const tabs = computed(() => [
  { value: 'upcoming', label: t('bookings.upcoming') },
  { value: 'past', label: t('bookings.past') },
  { value: 'cancelled', label: t('bookings.cancelled') },
])

const filteredBookings = computed(() => {
  const now = new Date()
  return bookings.value.filter(booking => {
    if (activeTab.value === 'cancelled') {
      return booking.status === 'cancelled'
    }
    if (activeTab.value === 'upcoming') {
      return new Date(booking.end_date) >= now && booking.status !== 'cancelled'
    }
    return new Date(booking.end_date) < now && booking.status !== 'cancelled'
  })
})

const getTabCount = (tab: string): number => {
  const now = new Date()
  return bookings.value.filter(booking => {
    if (tab === 'cancelled') return booking.status === 'cancelled'
    if (tab === 'upcoming') return new Date(booking.end_date) >= now && booking.status !== 'cancelled'
    return new Date(booking.end_date) < now && booking.status !== 'cancelled'
  }).length
}

const fetchBookings = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/bookings/mine')
    bookings.value = response.data.bookings
  } catch (error) {
    console.error('Error fetching bookings:', error)
    toast.error(t('errors.generic'))
  } finally {
    isLoading.value = false
  }
}

const handleCancelBooking = async (bookingId: number) => {
  try {
    await api.post(`/bookings/${bookingId}/cancel`, {
      reason: 'Cancelado por el usuario'
    })
    toast.success(t('bookings.status.cancelled'))
    fetchBookings()
  } catch (error: any) {
    const message = error.response?.data?.error || t('errors.generic')
    toast.error(message)
  }
}

onMounted(() => {
  fetchBookings()
})
</script>
