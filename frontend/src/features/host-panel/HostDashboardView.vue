<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('hostPanel.dashboard') }}
        </h1>
        <p class="text-gray-600">{{ t('hostPanel.welcome') }}, {{ authStore.user?.fullName }}</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="h-32 skeleton rounded-2xl" />
      </div>

      <!-- Dashboard -->
      <div v-else class="space-y-8">
        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.incomeThisMonth') }}</p>
            <p class="text-2xl font-bold text-primary-600">${{ formatPrice(dashboard.income_this_month) }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.bookingsThisMonth') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ dashboard.bookings_this_month }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.activeProperties') }}</p>
            <p class="text-2xl font-bold text-primary-600">{{ dashboard.active_properties }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.incomeTotal') }}</p>
            <p class="text-2xl font-bold text-primary-600">${{ formatPrice(dashboard.income_total) }}</p>
          </div>
        </div>

        <!-- Activity -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.upcomingArrivals') }} (7 {{ t('bookings.nights') }})</p>
            <p class="text-2xl font-bold text-green-600">{{ dashboard.upcoming_checkins }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.upcomingCheckouts') }} (7 {{ t('bookings.nights') }})</p>
            <p class="text-2xl font-bold text-orange-600">{{ dashboard.upcoming_checkouts }}</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p class="text-sm text-gray-500">{{ t('hostPanel.pendingPayouts') }}</p>
            <p class="text-2xl font-bold text-primary-600">${{ formatPrice(dashboard.pending_payout_amount) }}</p>
          </div>
        </div>

        <!-- Alerts -->
        <router-link
          v-if="dashboard.unanswered_reviews > 0"
          :to="`/${locale}/panel/reviews`"
          class="flex items-center justify-between gap-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors"
        >
          <p class="text-yellow-700">
            {{ dashboard.unanswered_reviews }} {{ t('hostPanel.unansweredReviews') }}
          </p>
          <span class="text-sm font-medium text-yellow-800 shrink-0">
            {{ t('hostPanel.replyToReview') }} &rarr;
          </span>
        </router-link>

        <!-- Quick links -->
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <router-link
            :to="`/${locale}/panel/properties`"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <Building class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('hostPanel.properties') }}</h3>
            <p class="text-sm text-gray-500">{{ t('hostPanel.myPropertiesSubtitle') }}</p>
          </router-link>
          <router-link
            :to="`/${locale}/panel/calendar`"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <Calendar class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('hostPanel.calendar') }}</h3>
            <p class="text-sm text-gray-500">{{ t('hostPanel.manageAvailability') }}</p>
          </router-link>
          <router-link
            :to="`/${locale}/panel/bookings`"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <BookOpen class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('hostPanel.bookings') }}</h3>
            <p class="text-sm text-gray-500">{{ t('hostPanel.viewAllBookings') }}</p>
          </router-link>
          <router-link
            :to="`/${locale}/panel/reviews`"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <Star class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('hostPanel.reviews') }}</h3>
            <p class="text-sm text-gray-500">{{ t('hostPanel.reviewsSubtitle') }}</p>
          </router-link>
          <router-link
            :to="`/${locale}/panel/finances`"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            <DollarSign class="w-8 h-8 text-primary-600 mb-3" />
            <h3 class="font-medium text-gray-900">{{ t('hostPanel.finances') }}</h3>
            <p class="text-sm text-gray-500">{{ t('hostPanel.historyExportCSV') }}</p>
          </router-link>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Calendar, BookOpen, DollarSign, Building, Star } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()

const locale = computed(() => (route.params.locale as string) || 'es')
const toast = useToast()

interface Dashboard {
  host_id: number
  bookings_this_month: number
  income_this_month: number
  income_total: number
  active_properties: number
  upcoming_checkins: number
  upcoming_checkouts: number
  pending_payouts: number
  pending_payout_amount: number
  unanswered_reviews: number
}

const dashboard = ref<Dashboard>({
  host_id: 0,
  bookings_this_month: 0,
  income_this_month: 0,
  income_total: 0,
  active_properties: 0,
  upcoming_checkins: 0,
  upcoming_checkouts: 0,
  pending_payouts: 0,
  pending_payout_amount: 0,
  unanswered_reviews: 0,
})
const isLoading = ref(true)

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO').format(price)
}

const fetchDashboard = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/host/dashboard')
    dashboard.value = response.data.dashboard
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    toast.error(t('toast.dashboardLoadError'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})
</script>
