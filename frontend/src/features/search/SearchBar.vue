<template>
  <div class="bg-white rounded-full shadow-soft border border-cream-200 p-2">
    <div class="flex items-center">
      <!-- Ciudad -->
      <div class="flex-1 px-4 border-r border-cream-200">
        <label class="text-xs font-medium text-gray-500 block mb-1">{{ t('search.city') }}</label>
        <select 
          v-model="filters.city" 
          class="w-full bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
        >
          <option value="">{{ t('search.allCities') }}</option>
          <option v-for="city in cities" :key="city.city" :value="city.city">
            {{ city.city }} ({{ city.property_count }})
          </option>
        </select>
      </div>

      <!-- Fechas -->
      <div class="flex-1 px-4 border-r border-cream-200">
        <label class="text-xs font-medium text-gray-500 block mb-1">{{ t('search.startDate') }}</label>
        <input 
          type="date" 
          v-model="filters.startDate"
          class="w-full bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
        />
      </div>

      <div class="flex-1 px-4 border-r border-cream-200">
        <label class="text-xs font-medium text-gray-500 block mb-1">{{ t('search.endDate') }}</label>
        <input 
          type="date" 
          v-model="filters.endDate"
          class="w-full bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
        />
      </div>

      <!-- Huéspedes -->
      <div class="flex-1 px-4">
        <label class="text-xs font-medium text-gray-500 block mb-1">{{ t('search.guests') }}</label>
        <select 
          v-model="filters.guests" 
          class="w-full bg-transparent text-gray-900 font-medium focus:outline-none cursor-pointer"
        >
          <option v-for="n in 10" :key="n" :value="n">{{ n }} {{ n > 1 ? t('search.guests plural') : t('search.guest') }}</option>
        </select>
      </div>

      <!-- Botón de búsqueda -->
      <button 
        @click="handleSearch"
        class="w-12 h-12 rounded-full bg-accent-700 hover:bg-accent-800 text-white flex items-center justify-center transition-colors shrink-0 ml-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '@/lib/api'
import { City } from '@/types'

const { t } = useI18n()

const emit = defineEmits<{
  search: [params: Record<string, any>]
}>()

const filters = reactive({
  city: '',
  startDate: '',
  endDate: '',
  guests: 1,
})

const cities = ref<City[]>([])

onMounted(async () => {
  try {
    const response = await api.get('/cities')
    cities.value = response.data.cities
  } catch (error) {
    console.error('Error loading cities:', error)
  }
})

const handleSearch = () => {
  const queryParams: Record<string, any> = {}
  
  if (filters.city) queryParams.city = filters.city
  if (filters.startDate) queryParams.start = filters.startDate
  if (filters.endDate) queryParams.end = filters.endDate
  if (filters.guests > 1) queryParams.guests = filters.guests

  emit('search', queryParams)
}
</script>
