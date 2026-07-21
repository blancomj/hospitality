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

        <!-- Actions -->
        <div v-if="booking.can_be_cancelled" class="flex gap-3">
          <button
            @click="showCancelModal = true"
            class="flex-1 py-3 border-2 border-red-500 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
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

      <!-- Cancel modal -->
      <div
        v-if="showCancelModal"
        class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        @click.self="showCancelModal = false"
      >
        <div class="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-4">{{ t('bookings.actions.cancel') }}</h3>
          <p class="text-gray-600 mb-4">
            {{ t('bookings.cancelPolicy') }}
          </p>
          <div class="flex gap-3">
            <button
              @click="showCancelModal = false"
              class="flex-1 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              @click="handleCancel"
              :disabled="isCancelling"
              class="flex-1 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
            >
              {{ isCancelling ? t('common.loading') : t('common.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import { Booking } from '@/types'

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()

const locale = computed(() => (route.params.locale as string) || 'es')
const booking = ref<Booking | null>(null)
const isLoading = ref(true)
const showCancelModal = ref(false)
const isCancelling = ref(false)

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
  }
  return classes[booking.value.status] || 'bg-gray-100 text-gray-800'
})

const statusLabel = computed(() => {
  if (!booking.value) return ''
  const labels: Record<string, string> = {
    pending_payment: t('bookings.status.pending_payment'),
    confirmed: t('bookings.status.confirmed'),
    cancelled: t('bookings.status.cancelled'),
    completed: t('bookings.status.completed'),
  }
  return labels[booking.value.status] || booking.value.status
})

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
  } catch (error) {
    console.error('Error fetching booking:', error)
    booking.value = null
  } finally {
    isLoading.value = false
  }
}

const handleCancel = async () => {
  if (!booking.value) return
  
  isCancelling.value = true
  try {
    await api.post(`/bookings/${booking.value.booking_id}/cancel`, {
      reason: 'Cancelado por el usuario'
    })
    toast.success(t('bookings.status.cancelled'))
    showCancelModal.value = false
    fetchBooking()
  } catch (error: any) {
    const message = error.response?.data?.error || 'Error al cancelar reserva'
    toast.error(message)
  } finally {
    isCancelling.value = false
  }
}

onMounted(() => {
  fetchBooking()
})
</script>
