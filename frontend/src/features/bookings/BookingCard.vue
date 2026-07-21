<template>
  <div class="card overflow-hidden">
    <!-- Property image placeholder -->
    <div class="h-32 bg-cream-200 flex items-center justify-center">
      <svg class="w-12 h-12 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    </div>

    <div class="p-4">
      <!-- Status badge -->
      <div class="flex items-center justify-between mb-2">
        <span 
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          :class="statusClasses"
        >
          {{ statusLabel }}
        </span>
        <span class="text-sm text-gray-500">{{ formatDate(booking.start_date) }}</span>
      </div>

      <!-- Property title -->
      <h3 class="font-semibold text-gray-900 mb-1 line-clamp-1">
        {{ booking.property_title }}
      </h3>

      <!-- Location -->
      <p class="text-sm text-gray-500 mb-2">
        {{ booking.property_city }}, {{ booking.property_neighborhood }}
      </p>

      <!-- Dates -->
      <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{{ formatDate(booking.start_date) }} - {{ formatDate(booking.end_date) }}</span>
      </div>

      <!-- Guests -->
      <div class="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{{ booking.guests_count }} huésped{{ booking.guests_count > 1 ? 'es' : '' }}</span>
      </div>

      <!-- Total -->
      <div class="flex items-center justify-between pt-3 border-t border-cream-200">
        <span class="text-sm text-gray-500">{{ booking.total_nights }} noches</span>
        <span class="text-lg font-bold text-gray-900">${{ formatPrice(booking.total_amount) }}</span>
      </div>

      <!-- Actions -->
      <div v-if="booking.can_be_cancelled" class="mt-3">
        <button
          @click="$emit('cancel', booking.booking_id)"
          class="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Cancelar reserva
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Booking } from '@/types'

interface Props {
  booking: Booking
}

const props = defineProps<Props>()

defineEmits<{
  cancel: [bookingId: number]
}>()

const statusClasses = computed(() => {
  const classes: Record<string, string> = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-blue-100 text-blue-800',
  }
  return classes[props.booking.status] || 'bg-gray-100 text-gray-800'
})

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    pending_payment: 'Pendiente de pago',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  }
  return labels[props.booking.status] || props.booking.status
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO').format(price)
}
</script>
