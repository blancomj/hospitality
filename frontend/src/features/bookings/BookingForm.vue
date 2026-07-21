<template>
  <div class="bg-white rounded-2xl shadow-soft border border-cream-200 p-6">
    <!-- Price header -->
    <div class="flex items-baseline gap-2 mb-6">
      <span class="text-3xl font-bold text-gray-900">${{ formatPrice(property.base_price_per_night) }}</span>
      <span class="text-gray-500">/noche</span>
    </div>

    <!-- Date inputs -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Llegada</label>
        <input
          v-model="form.startDate"
          type="date"
          :min="minDate"
          class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">Salida</label>
        <input
          v-model="form.endDate"
          type="date"
          :min="form.startDate || minDate"
          class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>

    <!-- Guests -->
    <div class="mb-6">
      <label class="block text-xs font-medium text-gray-500 mb-1">Huéspedes</label>
      <select
        v-model="form.guestsCount"
        class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option v-for="n in property.max_guests" :key="n" :value="n">
          {{ n }} huésped{{ n > 1 ? 'es' : '' }}
        </option>
      </select>
    </div>

    <!-- Reserve button -->
    <button
      @click="handleReserve"
      :disabled="!canReserve || isLoading"
      class="w-full py-3 bg-accent-700 hover:bg-accent-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span v-if="isLoading">Procesando...</span>
      <span v-else>Reservar</span>
    </button>

    <!-- Price breakdown -->
    <div v-if="nights > 0" class="mt-4 space-y-3 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-600">${{ formatPrice(property.base_price_per_night) }} x {{ nights }} noches</span>
        <span class="text-gray-900">${{ formatPrice(property.base_price_per_night * nights) }}</span>
      </div>
      <div class="flex justify-between font-medium text-lg pt-3 border-t border-cream-200">
        <span>Total</span>
        <span>${{ formatPrice(totalAmount) }}</span>
      </div>
    </div>

    <!-- Expiration notice -->
    <p v-if="nights > 0" class="mt-3 text-xs text-center text-gray-500">
      Tu reserva se mantendrá por 15 minutos mientras completas el pago
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import { Property, Booking } from '@/types'

interface Props {
  property: Property
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'booking-created': [booking: Booking]
}>()

const toast = useToast()

const form = reactive({
  startDate: '',
  endDate: '',
  guestsCount: 1,
})

const isLoading = ref(false)

const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const nights = computed(() => {
  if (!form.startDate || !form.endDate) return 0
  const start = new Date(form.startDate)
  const end = new Date(form.endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
})

const totalAmount = computed(() => {
  return props.property.base_price_per_night * nights.value
})

const canReserve = computed(() => {
  return form.startDate && form.endDate && form.guestsCount > 0 && nights.value > 0
})

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const handleReserve = async () => {
  if (!canReserve.value) return

  isLoading.value = true
  try {
    const response = await api.post('/bookings', {
      propertyId: props.property.id,
      startDate: form.startDate,
      endDate: form.endDate,
      guestsCount: form.guestsCount,
    })

    toast.success('Reserva creada correctamente')
    emit('booking-created', response.data.booking)
  } catch (error: any) {
    const message = error.response?.data?.error || 'Error al crear reserva'
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>
