<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Lo que ofrece este lugar</h3>
    
    <!-- Amenidades destacadas (primeras 8-10) -->
    <div class="grid grid-cols-2 gap-4">
      <div 
        v-for="amenity in highlightedAmenities" 
        :key="amenity.id"
        class="flex items-center gap-3"
      >
        <div class="w-6 h-6 flex items-center justify-center text-primary-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <span class="text-gray-900">{{ amenity.name }}</span>
          <span v-if="amenity.detail" class="block text-sm text-gray-500">{{ amenity.detail }}</span>
        </div>
      </div>
    </div>

    <!-- Botón "Mostrar todos" -->
    <button 
      v-if="amenities.length > 8"
      @click="showAll = true"
      class="px-6 py-3 border-2 border-gray-900 rounded-xl font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
    >
      Mostrar los {{ amenities.length }} servicios
    </button>

    <!-- Modal con todas las amenidades -->
    <div 
      v-if="showAll" 
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click.self="showAll = false"
    >
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-cream-200">
          <h3 class="text-xl font-semibold text-gray-900">
            Todo lo que ofrece este lugar
          </h3>
          <button 
            @click="showAll = false"
            class="w-8 h-8 rounded-full hover:bg-cream-100 flex items-center justify-center"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Contenido agrupado por categoría -->
        <div class="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div v-for="(items, category) in groupedAmenities" :key="category" class="mb-6 last:mb-0">
            <h4 class="font-medium text-gray-900 mb-3 capitalize">{{ formatCategory(category) }}</h4>
            <div class="space-y-3">
              <div 
                v-for="amenity in items" 
                :key="amenity.id"
                class="flex items-center gap-3"
              >
                <div class="w-5 h-5 flex items-center justify-center text-gray-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span class="text-gray-700">{{ amenity.name }}</span>
                  <span v-if="amenity.detail" class="text-sm text-gray-500 ml-2">- {{ amenity.detail }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Amenity } from '@/types'

interface Props {
  amenities?: Amenity[]
}

const props = withDefaults(defineProps<Props>(), {
  amenities: () => [],
})

const showAll = ref(false)

const highlightedAmenities = computed(() => {
  return props.amenities.slice(0, 8)
})

const groupedAmenities = computed(() => {
  const grouped: Record<string, Amenity[]> = {}
  for (const amenity of props.amenities) {
    if (!grouped[amenity.category]) {
      grouped[amenity.category] = []
    }
    grouped[amenity.category].push(amenity)
  }
  return grouped
})

const formatCategory = (category: string): string => {
  const names: Record<string, string> = {
    basicos: 'Básicos',
    cocina: 'Cocina',
    lavanderia: 'Lavandería',
    espacios: 'Espacios',
    edificio: 'Edificio/Conjunto',
    familia: 'Familia',
    seguridad: 'Seguridad',
    accesibilidad: 'Accesibilidad',
    politicas: 'Políticas',
  }
  return names[category] || category
}
</script>
