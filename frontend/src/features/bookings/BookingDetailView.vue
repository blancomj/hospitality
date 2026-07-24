<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div class="h-8 w-64 skeleton" />
        <div class="h-64 skeleton rounded-2xl" />
      </div>

      <!-- Booking detail -->
      <div v-else-if="booking" class="space-y-6">
        <!-- Header -->
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            {{ t('bookings.bookingId', { id: booking.booking_id }) }}
          </h1>
          <span 
            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            :class="statusClasses"
          >
            {{ statusLabel }}
          </span>
        </div>

        <!-- Property info -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ booking.property_title }}</h2>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Ubicación</span>
              <p class="font-medium">{{ booking.property_city }}, {{ booking.property_neighborhood }}</p>
            </div>
            <div>
              <span class="text-gray-500">Tipo</span>
              <p class="font-medium capitalize">{{ booking.property_type }}</p>
            </div>
          </div>
        </div>

        <!-- Booking details -->
        <div class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('bookings.bookingDetails') }}</h2>
          <div class="space-y-4">
            <div class="flex justify-between">
              <span class="text-gray-500">{{ t('search.startDate') }}</span>
              <span class="font-medium">{{ formatDate(booking.start_date) }} - {{ formatDate(booking.end_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">{{ t('bookings.nights') }}</span>
              <span class="font-medium">{{ booking.total_nights }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">{{ t('bookings.guests') }}</span>
              <span class="font-medium">{{ booking.guests_count }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">{{ t('property.pricePerNight') }}</span>
              <span class="font-medium">${{ formatPrice(booking.price_per_night) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold pt-3 border-t border-cream-200">
              <span>{{ t('bookings.total') }}</span>
              <span>${{ formatPrice(booking.total_amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Guest info (for host) -->
        <div v-if="isHost" class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Información del huésped</h2>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              <img 
                v-if="booking.guest_avatar"
                :src="booking.guest_avatar"
                :alt="booking.guest_name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-lg text-primary-600 font-semibold">
                {{ booking.guest_name?.charAt(0) || '?' }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ booking.guest_name }}</p>
              <p class="text-sm text-gray-500">{{ booking.guest_email }}</p>
            </div>
          </div>
        </div>

        <!-- Cancellation -->
        <div v-if="booking.status === 'cancelled' && booking.cancellation_reason" class="card p-6 border-red-200">
          <h2 class="text-lg font-semibold text-red-700 mb-2">{{ t('bookings.cancelPolicy') }}</h2>
          <p class="text-gray-600">{{ booking.cancellation_reason }}</p>
          <p class="text-sm text-gray-500 mt-2">
            Cancelado el {{ formatDateTime(booking.cancelled_at) }}
          </p>
        </div>

        <!-- Estado del reembolso -->
        <div
          v-if="booking.refund_request_status"
          class="card p-6 border-gold-200 bg-gold-50/40"
        >
          <h2 class="text-lg font-semibold text-primary-700 mb-2">
            {{ t('bookings.refundStatusTitle') }}
          </h2>
          <p class="text-gray-700 text-sm">
            {{ t(`bookings.refundStatus.${booking.refund_request_status}`) }}
          </p>
          <p v-if="booking.refund_requested_amount" class="text-sm text-gray-500 mt-2">
            {{ t('bookings.refundAmount') }}:
            <strong>{{ formatCOP(Number(booking.refund_requested_amount)) }}</strong>
          </p>
        </div>

        <!-- Pago pendiente: la pre-reserva caduca, así que esto va primero -->
        <div
          v-if="showPayButton"
          class="card p-6 border-accent-200 bg-accent-50/40 space-y-3"
        >
          <p class="text-sm text-accent-900">
            {{ t('payments.holdCountdown', { time: countdownLabel }) }}
          </p>
          <button
            class="w-full py-3 bg-accent-700 hover:bg-accent-800 text-white font-medium rounded-xl transition-colors"
            @click="goToPayment"
          >
            {{ t('bookings.actions.pay') }}
          </button>
        </div>

        <!-- Pre-reserva caducada -->
        <div
          v-else-if="booking.status === 'expired'"
          class="card p-6 border-gray-200"
        >
          <p class="text-sm text-gray-600 mb-3">{{ t('payments.holdExpired') }}</p>
          <button class="btn-primary w-full" @click="goToProperty">
            {{ t('bookings.bookAgain') }}
          </button>
        </div>

        <!-- Acciones -->
        <div v-if="booking.can_be_cancelled" class="flex gap-3">
          <button
            class="flex-1 py-3 border-2 border-red-500 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
            @click="showCancelModal = true"
          >
            {{ t('bookings.actions.cancel') }}
          </button>
        </div>
      </div>

      <!-- Not found -->
      <EmptyState
        v-else
        :title="t('errors.notFound')"
        :description="t('errors.generic')"
      >
        <template #action>
          <button @click="$router.push(`/${locale}/profile`)" class="btn-primary">
            {{ t('common.back') }}
          </button>
        </template>
      </EmptyState>

      <CancelBookingDialog
        :open="showCancelModal"
        :booking-id="booking?.booking_id ?? null"
        @close="showCancelModal = false"
        @cancelled="fetchBooking"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import CancelBookingDialog from './CancelBookingDialog.vue'
import { Booking } from '@/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const locale = computed(() => (route.params.locale as string) || 'es')
const booking = ref<Booking | null>(null)
const isLoading = ref(true)
const showCancelModal = ref(false)
const secondsLeft = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | undefined

const isHost = computed(() => {
  return authStore.user?.role === 'host' || authStore.user?.role === 'admin'
})

const statusClasses = computed(() => {
  if (!booking.value) return ''
  const classes: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
    expired: 'bg-gray-200 text-gray-700',
    refunded: 'bg-purple-100 text-purple-800',
  }
  return classes[booking.value.status] || 'bg-gray-100 text-gray-800'
})

const statusLabel = computed(() => {
  if (!booking.value) return ''
  return t(`bookings.status.${booking.value.status}`, booking.value.status)
})

const showPayButton = computed(
  () =>
    booking.value?.status === 'pending_payment' &&
    Boolean(booking.value?.can_be_paid) &&
    secondsLeft.value > 0
)

const countdownLabel = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = secondsLeft.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)

// La cuenta regresiva se calcula contra expires_at del servidor, no contra un
// contador local, para que recargar la página no reinicie el plazo.
const startCountdown = (expiresAt: string | null) => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (!expiresAt) {
    secondsLeft.value = 0
    return
  }

  const deadline = new Date(expiresAt).getTime()
  const tick = () => {
    secondsLeft.value = Math.max(0, Math.round((deadline - Date.now()) / 1000))
    if (secondsLeft.value === 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }

  tick()
  countdownTimer = setInterval(tick, 1000)
}

const goToPayment = () => {
  router.push({
    name: 'payment',
    params: { locale: locale.value, bookingId: booking.value?.booking_id },
  })
}

const goToProperty = () => {
  router.push({
    name: 'property-detail',
    params: { locale: locale.value, id: booking.value?.property_id },
  })
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CO', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const fetchBooking = async () => {
  isLoading.value = true
  try {
    const id = route.params.id
    const response = await api.get(`/bookings/${id}`)
    booking.value = response.data.booking

    if (booking.value?.status === 'pending_payment') {
      startCountdown(booking.value.expires_at)
    }
  } catch (error) {
    console.error('Error fetching booking:', error)
    booking.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBooking()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
