<template>
  <div class="bg-white rounded-2xl shadow-soft border border-cream-200 p-6">
    <!-- Precio por noche -->
    <div class="flex items-baseline gap-2 mb-6">
      <span class="text-3xl font-bold text-gray-900">
        {{ formatPrice(property.base_price_per_night) }}
      </span>
      <span class="text-gray-500">{{ t('property.perNight') }}</span>
    </div>

    <!-- Calendario -->
    <AvailabilityCalendar
      :availability="availability"
      :start-date="form.startDate"
      :end-date="form.endDate"
      class="mb-4"
      @select-date="handleDateSelect"
      @month-change="$emit('month-change', $event)"
    />

    <!-- Fechas seleccionadas -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">
          {{ t('search.startDate') }}
        </label>
        <input
          v-model="form.startDate"
          type="date"
          :min="minDate"
          class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">
          {{ t('search.endDate') }}
        </label>
        <input
          v-model="form.endDate"
          type="date"
          :min="minEndDate"
          class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>

    <!-- Huéspedes -->
    <div class="mb-4">
      <label class="block text-xs font-medium text-gray-500 mb-1">
        {{ t('bookings.guests') }}
      </label>
      <select
        v-model.number="form.guestsCount"
        class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option v-for="n in property.max_guests" :key="n" :value="n">
          {{ n }} {{ n === 1 ? t('property.guest') : t('property.guests') }}
        </option>
      </select>
    </div>

    <!-- Aviso de fechas no disponibles -->
    <p
      v-if="hasUnavailableDates"
      class="mb-4 text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-xl px-3 py-2"
    >
      {{ t('bookings.datesUnavailable') }}
    </p>

    <!-- Botón principal -->
    <button
      :disabled="!canReserve || isLoading"
      class="w-full py-3 bg-accent-700 hover:bg-accent-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      @click="handleReserve"
    >
      <span v-if="isLoading">{{ t('common.loading') }}</span>
      <span v-else-if="!isAuthenticated">{{ t('bookings.loginToBook') }}</span>
      <span v-else>{{ t('property.reserve') }}</span>
    </button>

    <!-- Desglose de precio -->
    <div v-if="nights > 0" class="mt-4 space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">
          {{ formatPrice(property.base_price_per_night) }} × {{ nights }}
          {{ nights === 1 ? t('property.night') : t('property.nights') }}
        </span>
        <span class="text-gray-900">{{ formatPrice(basePrice) }}</span>
      </div>

      <!-- El ajuste sólo aparece si el propietario definió precios especiales
           en alguna de las noches seleccionadas. -->
      <div v-if="priceAdjustment !== 0" class="flex justify-between">
        <span class="text-gray-600">{{ t('bookings.specialPricing') }}</span>
        <span :class="priceAdjustment > 0 ? 'text-gray-900' : 'text-primary-700'">
          {{ priceAdjustment > 0 ? '+' : '' }}{{ formatPrice(priceAdjustment) }}
        </span>
      </div>

      <div class="flex justify-between font-medium text-lg pt-3 border-t border-cream-200">
        <span>{{ t('property.total') }}</span>
        <span>{{ formatPrice(totalAmount) }}</span>
      </div>

      <p class="text-xs text-gray-400 text-right">{{ t('payments.chargedInCOP') }}</p>
    </div>

    <!-- Plazo de pago -->
    <p v-if="nights > 0" class="mt-3 text-xs text-center text-gray-500">
      {{ t('bookings.holdNotice', { minutes: expiryMinutes }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import { useCurrency } from '@/composables/useCurrency'
import api from '@/lib/api'
import AvailabilityCalendar from '@/components/property/AvailabilityCalendar.vue'
import type { Property, Availability, AvailabilityOverride } from '@/types'

interface Props {
  property: Property
  availability: Availability
  /** Minutos que dura la pre-reserva. Viene de platform_settings. */
  expiryMinutes?: number
}

const props = withDefaults(defineProps<Props>(), {
  expiryMinutes: 15,
})

defineEmits<{
  'month-change': [payload: { year: number; month: number }]
}>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const { formatPrice } = useCurrency()

const locale = computed(() => (route.params.locale as string) || 'es')
const isAuthenticated = computed(() => Boolean(authStore.user))

const form = reactive({
  startDate: '',
  endDate: '',
  guestsCount: 1,
})

const isLoading = ref(false)

const toISODate = (date: Date): string => {
  // No usar toISOString(): convierte a UTC y en Colombia (UTC-5) devuelve el
  // día anterior para cualquier hora antes de las 19:00.
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const minDate = computed(() => toISODate(new Date()))

const minEndDate = computed(() => {
  if (!form.startDate) return minDate.value
  const start = new Date(`${form.startDate}T00:00:00`)
  start.setDate(start.getDate() + 1)
  return toISODate(start)
})

const nights = computed(() => {
  if (!form.startDate || !form.endDate) return 0
  const start = new Date(`${form.startDate}T00:00:00`)
  const end = new Date(`${form.endDate}T00:00:00`)
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return diff > 0 ? diff : 0
})

/** Fechas de la estancia, sin incluir la noche de salida. */
const selectedNights = computed((): string[] => {
  if (nights.value === 0) return []
  const dates: string[] = []
  const cursor = new Date(`${form.startDate}T00:00:00`)
  for (let i = 0; i < nights.value; i++) {
    dates.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
})

const overridesByDate = computed(() => {
  const map = new Map<string, AvailabilityOverride>()
  for (const override of props.availability?.overrides ?? []) {
    map.set(String(override.date).substring(0, 10), override)
  }
  return map
})

const basePrice = computed(() => props.property.base_price_per_night * nights.value)

/**
 * Ajuste por precios especiales.
 *
 * Replica exactamente lo que hace sp_create_booking: por cada noche con
 * special_price, se suma la diferencia contra el precio base. Si esto no
 * coincide con el backend, el huésped ve un total y Wompi le cobra otro.
 */
const priceAdjustment = computed(() => {
  let adjustment = 0
  for (const date of selectedNights.value) {
    const override = overridesByDate.value.get(date)
    if (override?.special_price != null) {
      adjustment += Number(override.special_price) - props.property.base_price_per_night
    }
  }
  return adjustment
})

const totalAmount = computed(() => basePrice.value + priceAdjustment.value)

const hasUnavailableDates = computed(() => {
  if (nights.value === 0) return false

  for (const date of selectedNights.value) {
    const override = overridesByDate.value.get(date)
    if (override?.is_blocked) return true
  }

  // Solapamiento con reservas existentes: [inicio, fin) contra [inicio, fin).
  for (const booking of props.availability?.bookings ?? []) {
    const bookedStart = String(booking.start_date).substring(0, 10)
    const bookedEnd = String(booking.end_date).substring(0, 10)
    if (form.startDate < bookedEnd && form.endDate > bookedStart) return true
  }

  return false
})

const canReserve = computed(
  () => nights.value > 0 && form.guestsCount > 0 && !hasUnavailableDates.value
)

const handleDateSelect = ({ startDate, endDate }: { startDate: string; endDate: string }) => {
  form.startDate = startDate
  form.endDate = endDate
}

// Si el usuario mueve la llegada más allá de la salida, la salida deja de
// tener sentido y se limpia en vez de quedar en un estado imposible.
watch(
  () => form.startDate,
  () => {
    if (form.endDate && form.endDate <= form.startDate) {
      form.endDate = ''
    }
  }
)

const handleReserve = async () => {
  if (!isAuthenticated.value) {
    router.push({
      name: 'login',
      params: { locale: locale.value },
      query: { redirect: route.fullPath },
    })
    return
  }

  if (!canReserve.value) return

  isLoading.value = true
  try {
    const response = await api.post('/bookings', {
      propertyId: props.property.id,
      startDate: form.startDate,
      endDate: form.endDate,
      guestsCount: form.guestsCount,
    })

    const booking = response.data.booking
    toast.success(t('bookings.created'))

    // La pre-reserva vive pocos minutos: llevar al pago de inmediato, no
    // dejar al huésped en la ficha preguntándose qué sigue.
    router.push({
      name: 'payment',
      params: { locale: locale.value, bookingId: booking.booking_id },
    })
  } catch (error: any) {
    const status = error.response?.status

    if (status === 401) {
      router.push({
        name: 'login',
        params: { locale: locale.value },
        query: { redirect: route.fullPath },
      })
      return
    }

    // 409: alguien más tomó las fechas entre que se cargó el calendario y se
    // pulsó el botón. Es el caso normal de carrera, no un error del usuario.
    if (status === 409) {
      toast.error(error.response?.data?.error || t('bookings.datesUnavailable'))
      return
    }

    toast.error(error.response?.data?.error || t('errors.generic'))
  } finally {
    isLoading.value = false
  }
}
</script>
