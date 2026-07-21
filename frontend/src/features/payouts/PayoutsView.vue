<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          Historial de payouts
        </h1>
        <p class="text-gray-600">
          Tus pagos recibidos y comisiones
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-24 skeleton rounded-2xl" />
      </div>

      <!-- Payouts list -->
      <div v-else-if="payouts.length > 0" class="space-y-4">
        <div
          v-for="payout in payouts"
          :key="payout.payout_id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-medium text-gray-900">{{ payout.property_title }}</h3>
              <p class="text-sm text-gray-500">{{ payout.property_city }}</p>
              <p class="text-sm text-gray-500 mt-1">
                Check-in: {{ formatDate(payout.check_in) }} - Check-out: {{ formatDate(payout.check_out) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600">
                ${{ formatPrice(payout.net_amount) }}
              </p>
              <p class="text-sm text-gray-500">
                Comisión: ${{ formatPrice(payout.commission_amount) }}
              </p>
              <span
                :class="[
                  'inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium',
                  getStatusClass(payout.status)
                ]"
              >
                {{ getStatusLabel(payout.status) }}
              </span>
            </div>
          </div>
          <div v-if="payout.wompi_payout_reference" class="mt-3 text-xs text-gray-400">
            Referencia: {{ payout.wompi_payout_reference }}
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="Sin payouts"
        description="Aún no has recibido ningún pago."
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const toast = useToast()

interface PayoutHistory {
  payout_id: number
  booking_id: number
  gross_amount: number
  commission_amount: number
  net_amount: number
  status: string
  wompi_payout_reference: string | null
  paid_at: string | null
  property_title: string
  property_city: string
  check_in: string
  check_out: string
  created_at: string
}

const payouts = ref<PayoutHistory[]>([])
const isLoading = ref(true)

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO')
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-green-100 text-green-700'
    case 'processing': return 'bg-yellow-100 text-yellow-700'
    case 'pending': return 'bg-gray-100 text-gray-700'
    case 'failed': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Pagado'
    case 'processing': return 'Procesando'
    case 'pending': return 'Pendiente'
    case 'failed': return 'Fallido'
    default: return status
  }
}

const fetchPayouts = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/payouts/mine')
    payouts.value = response.data.payouts
  } catch (error) {
    console.error('Error fetching payouts:', error)
    toast.error('Error al cargar historial de payouts')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPayouts()
})
</script>
