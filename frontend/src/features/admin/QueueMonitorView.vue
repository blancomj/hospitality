<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-serif text-primary-700">Colas de trabajo</h1>
          <p class="text-gray-600 mt-1">Monitoreo de tareas asíncronas</p>
        </div>
        <button
          @click="refreshStats"
          class="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          Actualizar
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="i in 4" :key="i" class="h-32 skeleton rounded-2xl" />
      </div>

      <!-- Stats Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Image Processing Queue -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-blue-100 rounded-lg">
              <ImageIcon class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="font-medium text-gray-900">Imágenes</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">En cola</span>
              <span class="font-medium">{{ stats.image.waiting }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Activas</span>
              <span class="font-medium">{{ stats.image.active }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Completadas</span>
              <span class="font-medium text-green-600">{{ stats.image.completed }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Fallidas</span>
              <span class="font-medium text-red-600">{{ stats.image.failed }}</span>
            </div>
          </div>
        </div>

        <!-- Email Queue -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-green-100 rounded-lg">
              <Mail class="w-5 h-5 text-green-600" />
            </div>
            <h3 class="font-medium text-gray-900">Emails</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">En cola</span>
              <span class="font-medium">{{ stats.email.waiting }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Activas</span>
              <span class="font-medium">{{ stats.email.active }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Completadas</span>
              <span class="font-medium text-green-600">{{ stats.email.completed }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Fallidas</span>
              <span class="font-medium text-red-600">{{ stats.email.failed }}</span>
            </div>
          </div>
        </div>

        <!-- Payout Queue -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <DollarSign class="w-5 h-5 text-yellow-600" />
            </div>
            <h3 class="font-medium text-gray-900">Payouts</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">En cola</span>
              <span class="font-medium">{{ stats.payout.waiting }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Activas</span>
              <span class="font-medium">{{ stats.payout.active }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Completadas</span>
              <span class="font-medium text-green-600">{{ stats.payout.completed }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Fallidas</span>
              <span class="font-medium text-red-600">{{ stats.payout.failed }}</span>
            </div>
          </div>
        </div>

        <!-- iCal Sync Queue -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-purple-100 rounded-lg">
              <CalendarIcon class="w-5 h-5 text-purple-600" />
            </div>
            <h3 class="font-medium text-gray-900">iCal Sync</h3>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">En cola</span>
              <span class="font-medium">{{ stats.sync.waiting }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Activas</span>
              <span class="font-medium">{{ stats.sync.active }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Completadas</span>
              <span class="font-medium text-green-600">{{ stats.sync.completed }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Fallidas</span>
              <span class="font-medium text-red-600">{{ stats.sync.failed }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Bull Board Dashboard (iframe) -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <h2 class="text-lg font-medium text-gray-900">Dashboard detallado</h2>
          <p class="text-sm text-gray-600">Monitoreo en tiempo real de las colas</p>
        </div>
        <div class="h-[600px]">
          <iframe
            v-if="isDev"
            :src="queueDashboardUrl"
            class="w-full h-full border-0"
            title="Queue Dashboard"
          />
          <div v-else class="flex items-center justify-center h-full text-gray-500">
            <p>Dashboard disponible solo en modo desarrollo</p>
          </div>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw, Image as ImageIcon, Mail, DollarSign, Calendar as CalendarIcon } from 'lucide-vue-next'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const isDev = import.meta.env.DEV
const isLoading = ref(true)
const queueDashboardUrl = ref('/admin/queues')

const stats = ref({
  image: { waiting: 0, active: 0, completed: 0, failed: 0 },
  email: { waiting: 0, active: 0, completed: 0, failed: 0 },
  payout: { waiting: 0, active: 0, completed: 0, failed: 0 },
  sync: { waiting: 0, active: 0, completed: 0, failed: 0 },
})

const fetchStats = async () => {
  try {
    const response = await api.get('/admin/queues/stats')
    stats.value = response.data
  } catch (error) {
    console.error('Error fetching queue stats:', error)
  }
}

const refreshStats = async () => {
  isLoading.value = true
  await fetchStats()
  isLoading.value = false
}

onMounted(async () => {
  await refreshStats()
})
</script>
