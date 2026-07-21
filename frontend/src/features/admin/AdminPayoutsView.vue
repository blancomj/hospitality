<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            Gestión de payouts
          </h1>
          <p class="text-gray-600">
            Administra los pagos a propietarios
          </p>
        </div>
        <button
          @click="runPayouts"
          :disabled="isProcessing"
          class="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {{ isProcessing ? 'Procesando...' : 'Ejecutar payouts pendientes' }}
        </button>
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
              <h3 class="font-medium text-gray-900">{{ payout.host_name }}</h3>
              <p class="text-sm text-gray-500">{{ payout.host_email }}</p>
              <p class="text-sm text-gray-500 mt-1">
                Propiedad: {{ payout.property_title }} ({{ payout.property_city }})
              </p>
              <p class="text-sm text-gray-500">
                Check-in: {{ formatDate(payout.check_in) }} - Check-out: {{ formatDate(payout.check_out) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-primary-600">
                ${{ formatPrice(payout.net_amount) }}
              </p>
              <p class="text-sm text-gray-500">
                Bruto: ${{ formatPrice(payout.gross_amount) }}
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
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="Sin payouts pendientes"
        description="No hay payouts pendientes de procesar."
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

interface Payout {
  payout_id: number
  host_id: number
  gross_amount: number
  commission_amount: number
  net_amount: number
  status: string
  host_name: string
  host_email: string
  property_title: string
  property_city: string
  check_in: string
  check_out: string
  created_at: string
}

const payouts = ref<Payout[]>([])
const isLoading = ref(true)
const isProcessing = ref(false)

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
    const response = await api.get('/admin/payouts')
    payouts.value = response.data.payouts
  } catch (error) {
    console.error('Error fetching payouts:', error)
    toast.error('Error al cargar payouts pendientes')
  } finally {
    isLoading.value = false
  }
}

const runPayouts = async () => {
  isProcessing.value = true
  try {
    const response = await api.post('/payouts/run')
    toast.success(`${response.data.processedCount} payouts en procesamiento`)
    await fetchPayouts()
  } catch (error) {
    console.error('Error running payouts:', error)
    toast.error('Error al ejecutar payouts')
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  fetchPayouts()
})
</script>
