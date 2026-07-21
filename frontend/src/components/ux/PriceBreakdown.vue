<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Desglose de precio</h3>
    
    <div class="space-y-3">
      <!-- Price per night -->
      <div class="flex justify-between">
        <span class="text-gray-600">
          ${{ formatPrice(pricePerNight) }} x {{ nights }} {{ nights === 1 ? 'noche' : 'noches' }}
        </span>
        <span class="font-medium">${{ formatPrice(pricePerNight * nights) }}</span>
      </div>

      <!-- Service fee (if applicable) -->
      <div v-if="serviceFee > 0" class="flex justify-between">
        <span class="text-gray-600">Comisión de servicio</span>
        <span class="font-medium">${{ formatPrice(serviceFee) }}</span>
      </div>

      <!-- Discount (if applicable) -->
      <div v-if="discount > 0" class="flex justify-between text-green-600">
        <span>Descuento</span>
        <span class="font-medium">-${{ formatPrice(discount) }}</span>
      </div>

      <!-- Total -->
      <div class="border-t border-gray-200 pt-3 mt-3">
        <div class="flex justify-between">
          <span class="text-lg font-semibold">Total</span>
          <span class="text-lg font-bold text-primary-600">
            ${{ formatPrice(total) }} COP
          </span>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <p class="text-xs text-gray-500 mt-4">
      El precio final incluye todos los impuestos y tarifas.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pricePerNight: number
  nights: number
  serviceFeePercentage?: number
  discount?: number
}>()

const serviceFee = computed(() => {
  const percentage = props.serviceFeePercentage || 0
  return Math.round(props.pricePerNight * props.nights * percentage / 100)
})

const discount = computed(() => props.discount || 0)

const total = computed(() => {
  return (props.pricePerNight * props.nights) + serviceFee.value - discount.value
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}
</script>
