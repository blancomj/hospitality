<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          Reporte de comisiones
        </h1>
        <p class="text-gray-600">
          Desglose de comisiones por período
        </p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
            <input
              v-model="fromDate"
              type="date"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
            <input
              v-model="toDate"
              type="date"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            @click="fetchReport"
            :disabled="isLoading"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {{ isLoading ? 'Cargando...' : 'Consultar' }}
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="report.length > 0" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">Total reservas</p>
          <p class="text-2xl font-bold text-primary-600">{{ report.length }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">Monto bruto total</p>
          <p class="text-2xl font-bold text-primary-600">${{ formatPrice(totalGross) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">Comisión total</p>
          <p class="text-2xl font-bold text-primary-600">${{ formatPrice(totalCommission) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">Neto propietarios</p>
          <p class="text-2xl font-bold text-primary-600">${{ formatPrice(totalNet) }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <!-- Report table -->
      <div v-else-if="report.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedad</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propietario</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Neto</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in report" :key="row.payout_id">
              <td class="px-6 py-4">
                <p class="font-medium text-gray-900">{{ row.property_title }}</p>
                <p class="text-sm text-gray-500">{{ row.property_city }}</p>
              </td>
              <td class="px-6 py-4">
                <p class="text-gray-900">{{ row.host_name }}</p>
                <p class="text-sm text-gray-500">{{ row.host_email }}</p>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">{{ formatDate(row.check_in) }}</td>
              <td class="px-6 py-4 text-right text-sm text-gray-900">${{ formatPrice(row.gross_amount) }}</td>
              <td class="px-6 py-4 text-right text-sm text-gray-900">${{ formatPrice(row.commission_amount) }}</td>
              <td class="px-6 py-4 text-right text-sm text-gray-900">${{ formatPrice(row.net_amount) }}</td>
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    'inline-block px-3 py-1 rounded-full text-xs font-medium',
                    getStatusClass(row.payout_status)
                  ]"
                >
                  {{ getStatusLabel(row.payout_status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="Sin datos"
        description="Selecciona un período para ver el reporte de comisiones."
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const toast = useToast()

interface CommissionReportRow {
  payout_id: number
  booking_id: number
  property_title: string
  property_city: string
  host_name: string
  host_email: string
  gross_amount: number
  commission_amount: number
  net_amount: number
  commission_rate: number
  payout_status: string
  check_in: string
  check_out: string
  booking_status: string
  payout_created_at: string
  paid_at: string | null
}

const report = ref<CommissionReportRow[]>([])
const isLoading = ref(false)

// Default to current month
const today = new Date()
const fromDate = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
const toDate = ref(today.toISOString().split('T')[0])

const totalGross = computed(() => report.value.reduce((sum, r) => sum + r.gross_amount, 0))
const totalCommission = computed(() => report.value.reduce((sum, r) => sum + r.commission_amount, 0))
const totalNet = computed(() => report.value.reduce((sum, r) => sum + r.net_amount, 0))

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

const fetchReport = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/admin/reports/commissions', {
      params: { from: fromDate.value, to: toDate.value }
    })
    report.value = response.data.report
  } catch (error) {
    console.error('Error fetching report:', error)
    toast.error('Error al cargar reporte')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchReport()
})
</script>
