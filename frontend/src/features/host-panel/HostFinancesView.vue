<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            {{ t('hostPanel.financesTitle') }}
          </h1>
          <p class="text-gray-600">{{ t('hostPanel.financesSubtitle') }}</p>
        </div>
        <button
          @click="exportCSV"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {{ t('common.exportCSV') }}
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('common.from') }}</label>
            <input
              v-model="fromDate"
              type="date"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('common.to') }}</label>
            <input
              v-model="toDate"
              type="date"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            @click="fetchFinances"
            :disabled="isLoading"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {{ isLoading ? t('common.loading') : t('common.query') }}
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="finances.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">{{ t('hostPanel.totalGross') }}</p>
          <p class="text-2xl font-bold text-primary-600">${{ formatPrice(totalGross) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">{{ t('hostPanel.totalCommission') }}</p>
          <p class="text-2xl font-bold text-red-600">${{ formatPrice(totalCommission) }}</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p class="text-sm text-gray-500">{{ t('hostPanel.totalNet') }}</p>
          <p class="text-2xl font-bold text-green-600">${{ formatPrice(totalNet) }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <!-- Finances table -->
      <div v-else-if="finances.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('common.property') }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('hostPanel.checkIn') }}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('hostPanel.checkOut') }}</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('common.gross') }}</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('common.commission') }}</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('common.net') }}</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in finances" :key="row.payout_id">
              <td class="px-6 py-4">
                <p class="font-medium text-gray-900">{{ row.property_title }}</p>
                <p class="text-sm text-gray-500">{{ row.property_city }}</p>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">{{ formatDate(row.check_in) }}</td>
              <td class="px-6 py-4 text-sm text-gray-900">{{ formatDate(row.check_out) }}</td>
              <td class="px-6 py-4 text-right text-sm text-gray-900">${{ formatPrice(row.gross_amount) }}</td>
              <td class="px-6 py-4 text-right text-sm text-red-600">${{ formatPrice(row.commission_amount) }}</td>
              <td class="px-6 py-4 text-right text-sm text-green-600">${{ formatPrice(row.net_amount) }}</td>
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    'inline-block px-3 py-1 rounded-full text-xs font-medium',
                    getStatusClass(row.status)
                  ]"
                >
                  {{ getStatusLabel(row.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        :title="t('hostPanel.noData')"
        :description="t('hostPanel.noDataDescription')"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const { t } = useI18n()
const toast = useToast()

interface FinanceRecord {
  payout_id: number
  booking_id: number
  property_title: string
  property_city: string
  check_in: string
  check_out: string
  gross_amount: number
  commission_amount: number
  net_amount: number
  status: string
  wompi_payout_reference: string | null
  paid_at: string | null
  created_at: string
}

const finances = ref<FinanceRecord[]>([])
const isLoading = ref(false)

const today = new Date()
const fromDate = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
const toDate = ref(today.toISOString().split('T')[0])

const totalGross = computed(() => finances.value.reduce((sum, r) => sum + r.gross_amount, 0))
const totalCommission = computed(() => finances.value.reduce((sum, r) => sum + r.commission_amount, 0))
const totalNet = computed(() => finances.value.reduce((sum, r) => sum + r.net_amount, 0))

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
    case 'paid': return t('hostPanel.paid')
    case 'processing': return t('hostPanel.processing')
    case 'pending': return t('hostPanel.pending')
    case 'failed': return t('hostPanel.failed')
    default: return status
  }
}

const fetchFinances = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/host/finances', {
      params: { from: fromDate.value, to: toDate.value }
    })
    finances.value = response.data.finances
  } catch (error) {
    console.error('Error fetching finances:', error)
    toast.error(t('toast.financesLoadError'))
  } finally {
    isLoading.value = false
  }
}

const exportCSV = async () => {
  try {
    const response = await api.get('/host/finances', {
      params: { from: fromDate.value, to: toDate.value, format: 'csv' },
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `finances-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('Error exporting CSV:', error)
    toast.error(t('toast.csvExportError'))
  }
}

onMounted(() => {
  fetchFinances()
})
</script>
