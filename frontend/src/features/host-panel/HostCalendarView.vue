<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-serif text-primary-700 mb-2">
            {{ t('hostPanel.calendarTitle') }}
          </h1>
          <p class="text-gray-600">{{ t('hostPanel.calendarSubtitle') }}</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="prevWeek"
            class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <button
            @click="goToday"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.today') }}
          </button>
          <button
            @click="nextWeek"
            class="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <!-- Calendar -->
      <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <!-- Date headers -->
        <div class="grid grid-cols-8 border-b border-gray-200">
          <div class="p-3 text-sm font-medium text-gray-500">{{ t('hostPanel.propertyName') }}</div>
          <div
            v-for="date in dates"
            :key="date"
            class="p-3 text-center text-sm font-medium"
            :class="isToday(date) ? 'bg-primary-50 text-primary-700' : 'text-gray-500'"
          >
            {{ formatDateShort(date) }}
          </div>
        </div>

        <!-- Property rows -->
        <div
          v-for="property in properties"
          :key="property.id"
          class="border-b border-gray-100 last:border-b-0"
        >
          <div class="grid grid-cols-8">
            <div class="p-3 border-r border-gray-100">
              <p class="font-medium text-gray-900 text-sm truncate">{{ property.title }}</p>
              <p class="text-xs text-gray-500">{{ property.city }}</p>
            </div>
            <div
              v-for="date in dates"
              :key="date"
              class="p-1 border-r border-gray-100 last:border-r-0 min-h-[60px]"
            >
              <div
                v-for="event in getEvents(property.id, date)"
                :key="event.booking_id || event.date"
                :class="[
                  'text-xs p-1 rounded mb-1 truncate cursor-pointer',
                  getEventClass(event.status)
                ]"
                :title="event.guest_name || t('hostPanel.blocked')"
              >
                {{ event.guest_name || (event.is_blocked ? t('hostPanel.blocked') : t('hostPanel.available')) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="mt-4 flex gap-4 text-sm">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span class="text-gray-600">{{ t('hostPanel.confirmed') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
          <span class="text-gray-600">{{ t('hostPanel.available') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
          <span class="text-gray-600">{{ t('hostPanel.blocked') }}</span>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const toast = useToast()

interface Property {
  id: number
  title: string
  city: string
}

interface CalendarEvent {
  property_id: number
  property_title: string
  date: string
  status: string
  booking_id: number | null
  guest_name: string | null
  is_blocked: boolean
  special_price: number | null
}

const properties = ref<Property[]>([])
const events = ref<CalendarEvent[]>([])
const isLoading = ref(true)
const currentDate = ref(new Date())

const dates = computed(() => {
  const start = new Date(currentDate.value)
  start.setDate(start.getDate() - start.getDay())
  const result = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    result.push(d.toISOString().split('T')[0])
  }
  return result
})

const formatDateShort = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
}

const isToday = (date: string) => {
  return date === new Date().toISOString().split('T')[0]
}

const prevWeek = () => {
  currentDate.value.setDate(currentDate.value.getDate() - 7)
  fetchCalendar()
}

const nextWeek = () => {
  currentDate.value.setDate(currentDate.value.getDate() + 7)
  fetchCalendar()
}

const goToday = () => {
  currentDate.value = new Date()
  fetchCalendar()
}

const getEvents = (propertyId: number, date: string) => {
  return events.value.filter(e => e.property_id === propertyId && e.date === date)
}

const getEventClass = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-700 border border-green-300'
    case 'blocked': return 'bg-red-100 text-red-700 border border-red-300'
    default: return 'bg-gray-50 text-gray-500'
  }
}

const fetchCalendar = async () => {
  isLoading.value = true
  try {
    const from = dates.value[0]
    const to = dates.value[dates.value.length - 1]
    const response = await api.get('/host/calendar', { params: { from, to } })
    events.value = response.data.calendar
    
    // Extract unique properties
    const propsMap = new Map<number, Property>()
    response.data.calendar.forEach((e: CalendarEvent) => {
      if (!propsMap.has(e.property_id)) {
        propsMap.set(e.property_id, {
          id: e.property_id,
          title: e.property_title,
          city: '',
        })
      }
    })
    properties.value = Array.from(propsMap.values())
  } catch (error) {
    console.error('Error fetching calendar:', error)
    toast.error(t('toast.calendarLoadError'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCalendar()
})
</script>
