<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Disponibilidad</h3>
    
    <!-- Calendario simplificado -->
    <div class="bg-white rounded-2xl p-4 border border-cream-200">
      <!-- Header del mes -->
      <div class="flex items-center justify-between mb-4">
        <button 
          @click="prevMonth"
          class="w-8 h-8 rounded-full hover:bg-cream-100 flex items-center justify-center"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span class="font-medium text-gray-900">{{ monthNames[currentMonth] }} {{ currentYear }}</span>
        <button 
          @click="nextMonth"
          class="w-8 h-8 rounded-full hover:bg-cream-100 flex items-center justify-center"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Días de la semana -->
      <div class="grid grid-cols-7 gap-1 mb-2">
        <div v-for="day in weekDays" :key="day" class="text-center text-sm font-medium text-gray-500 py-2">
          {{ day }}
        </div>
      </div>

      <!-- Días del mes -->
      <div class="grid grid-cols-7 gap-1">
        <!-- Espacios vacíos al inicio -->
        <div v-for="i in firstDayOfMonth" :key="`empty-${i}`" />
        
        <!-- Días del mes -->
        <div 
          v-for="day in daysInMonth" 
          :key="day"
          class="aspect-square flex items-center justify-center rounded-full text-sm relative"
          :class="getDayClass(day)"
        >
          <span :class="isToday(day) ? 'font-bold' : ''">{{ day }}</span>
          
          <!-- Indicador de ocupado -->
          <div 
            v-if="isBlocked(day)"
            class="absolute bottom-1 w-1 h-1 rounded-full bg-accent-700"
          />
          
          <!-- Indicador de precio especial -->
          <div 
            v-if="getSpecialPrice(day)"
            class="absolute bottom-1 w-1 h-1 rounded-full bg-gold-400"
          />
        </div>
      </div>

      <!-- Leyenda -->
      <div class="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-cream-200" />
          <span>Disponible</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-gray-300" />
          <span>Ocupado</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full bg-primary-500" />
          <span>Seleccionado</span>
        </div>
      </div>
    </div>

    <!-- Rango de fechas seleccionado -->
    <div v-if="startDate && endDate" class="bg-primary-50 rounded-xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600">Llegada</p>
          <p class="font-medium text-gray-900">{{ formatDate(startDate) }}</p>
        </div>
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div class="text-right">
          <p class="text-sm text-gray-600">Salida</p>
          <p class="font-medium text-gray-900">{{ formatDate(endDate) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface AvailabilityOverride {
  date: string
  is_blocked?: boolean
  special_price?: number | null
}

interface AvailabilityBooking {
  start_date: string
  end_date: string
  status: string
}

interface Availability {
  overrides?: AvailabilityOverride[]
  bookings?: AvailabilityBooking[]
}

interface Props {
  availability?: Availability
  startDate?: string | null
  endDate?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  availability: () => ({ overrides: [], bookings: [] }),
  startDate: null,
  endDate: null,
})

defineEmits<{
  'select-date': [payload: { startDate: string; endDate: string }]
}>()

const currentDate = new Date()
const currentMonth = ref(currentDate.getMonth())
const currentYear = ref(currentDate.getFullYear())

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const weekDays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']

const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

const firstDayOfMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay()
})

const isToday = (day: number): boolean => {
  const today = new Date()
  return day === today.getDate() && 
         currentMonth.value === today.getMonth() && 
         currentYear.value === today.getFullYear()
}

const isBlocked = (day: number): boolean => {
  const date = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  const override = props.availability.overrides?.find(o => o.date === date)
  if (override?.is_blocked) return true
  
  const booking = props.availability.bookings?.find(b => 
    date >= b.start_date && date < b.end_date
  )
  return !!booking
}

const getSpecialPrice = (day: number): number | null => {
  const date = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const override = props.availability.overrides?.find(o => o.date === date)
  return override?.special_price || null
}

const getDayClass = (day: number): string => {
  const date = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  if (isBlocked(day)) {
    return 'bg-gray-100 text-gray-400 cursor-not-allowed'
  }
  
  if (date === props.startDate || date === props.endDate) {
    return 'bg-primary-500 text-white font-medium'
  }
  
  if (props.startDate && props.endDate && date > props.startDate && date < props.endDate) {
    return 'bg-primary-100 text-primary-700'
  }
  
  return 'hover:bg-cream-100 cursor-pointer'
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
}
</script>
