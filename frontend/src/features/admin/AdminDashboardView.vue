<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            {{ t('admin.dashboard') }}
          </h1>
          <p class="text-gray-600">{{ t('admin.globalKPIs') }}</p>
        </div>
        <div class="flex gap-2">
          <input
            v-model="fromDate"
            type="date"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <input
            v-model="toDate"
            type="date"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <button
            @click="fetchKPIs"
            :disabled="isLoading"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {{ t('common.consult') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="i in 12" :key="i" class="h-28 skeleton rounded-2xl" />
      </div>

      <!-- KPIs -->
      <div v-else class="space-y-6">
        <!-- Bookings -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.totalBookings') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ kpis.total_bookings }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.confirmed') }}</p>
            <p class="text-2xl font-bold text-green-600">{{ kpis.confirmed_bookings }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.completed') }}</p>
            <p class="text-2xl font-bold text-blue-600">{{ kpis.completed_bookings }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.cancelled') }}</p>
            <p class="text-2xl font-bold text-red-600">{{ kpis.cancelled_bookings }}</p>
          </div>
        </div>

        <!-- Financial -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.gmv') }}</p>
            <p class="text-2xl font-bold text-primary-600">${{ formatPrice(kpis.gmv) }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.commissionsGenerated') }}</p>
            <p class="text-2xl font-bold text-green-600">${{ formatPrice(kpis.commissions_generated) }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.pendingPayouts') }}</p>
            <p class="text-2xl font-bold text-yellow-600">${{ formatPrice(kpis.pending_payout_amount) }}</p>
          </div>
        </div>

        <!-- Users & Properties -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.totalUsers') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ kpis.total_users }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.newUsers30d') }}</p>
            <p class="text-2xl font-bold text-green-600">{{ kpis.new_users_30d }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.hosts') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ kpis.total_hosts }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('admin.activeProperties') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ kpis.active_properties }}</p>
          </div>
        </div>

        <!-- Quick links -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <router-link
            to="/admin/host-approvals"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <UserCheck class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.approveHosts') }}</h3>
            <p v-if="kpis.pending_host_approvals > 0" class="text-sm text-yellow-600">
              {{ kpis.pending_host_approvals }} {{ t('admin.pending') }}
            </p>
          </router-link>
          <router-link
            to="/admin/payouts"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <DollarSign class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.payouts') }}</h3>
            <p class="text-sm text-gray-500">{{ kpis.pending_payouts }} {{ t('admin.pending') }}</p>
          </router-link>
          <router-link
            to="/admin/reports/commissions"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <BarChart class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.reports') }}</h3>
            <p class="text-sm text-gray-500">{{ t('admin.reportsSubtitle') }}</p>
          </router-link>
          <router-link
            to="/admin/settings"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <Settings class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.settings') }}</h3>
            <p class="text-sm text-gray-500">{{ t('admin.platformSettings') }}</p>
          </router-link>
          <router-link
            to="/admin/refunds"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <RotateCcw class="w-8 h-8 text-accent-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.refunds.title') }}</h3>
            <p class="text-sm text-gray-500">{{ t('admin.refunds.subtitle') }}</p>
          </router-link>
          <router-link
            to="/admin/users"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <Users class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.users') }}</h3>
            <p class="text-sm text-gray-500">{{ t('admin.usersSubtitle') }}</p>
          </router-link>
          <router-link
            to="/admin/queues"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <ListChecks class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('admin.queues') }}</h3>
            <p class="text-sm text-gray-500">{{ t('admin.queuesSubtitle') }}</p>
          </router-link>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UserCheck, DollarSign, BarChart, Settings, RotateCcw, Users, ListChecks } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const toast = useToast()

interface AdminKPIs {
  total_bookings: number
  confirmed_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  gmv: number
  commissions_generated: number
  pending_payouts: number
  pending_payout_amount: number
  paid_payouts: number
  paid_payout_amount: number
  total_users: number
  new_users_30d: number
  total_hosts: number
  pending_host_approvals: number
  active_properties: number
}

const kpis = ref<AdminKPIs>({
  total_bookings: 0,
  confirmed_bookings: 0,
  completed_bookings: 0,
  cancelled_bookings: 0,
  gmv: 0,
  commissions_generated: 0,
  pending_payouts: 0,
  pending_payout_amount: 0,
  paid_payouts: 0,
  paid_payout_amount: 0,
  total_users: 0,
  new_users_30d: 0,
  total_hosts: 0,
  pending_host_approvals: 0,
  active_properties: 0,
})
const isLoading = ref(true)

const today = new Date()
const fromDate = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`)
const toDate = ref(today.toISOString().split('T')[0])

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const fetchKPIs = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/admin/dashboard', {
      params: { from: fromDate.value, to: toDate.value }
    })
    kpis.value = response.data.kpis
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    toast.error(t('toast.kpisLoadError'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchKPIs()
})
</script>
