<template>
  <div class="space-y-4">
    <h3 class="text-lg font-semibold text-gray-900">Dónde estarás</h3>
    
    <!-- Mapa -->
    <div class="rounded-2xl overflow-hidden h-80 bg-cream-200">
      <div v-if="latitude && longitude" ref="mapContainer" class="w-full h-full" />
      <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-2 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p>Ubicación no disponible</p>
        </div>
      </div>
    </div>

    <!-- Información de ubicación -->
    <div class="space-y-3">
      <div v-if="neighborhood" class="flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        </svg>
        <span class="text-gray-700">{{ neighborhood }}</span>
      </div>

      <div v-if="address" class="flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-gray-700">{{ address }}</span>
      </div>

      <div v-if="directionsNote" class="bg-cream-100 rounded-xl p-4">
        <h4 class="font-medium text-gray-900 mb-2">Cómo llegar</h4>
        <p class="text-gray-600 text-sm">{{ directionsNote }}</p>
      </div>

      <div v-if="areaNote" class="bg-cream-100 rounded-xl p-4">
        <h4 class="font-medium text-gray-900 mb-2">Información del sector</h4>
        <p class="text-gray-600 text-sm">{{ areaNote }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import type { Map as LeafletMap, Circle } from 'leaflet'

interface Props {
  latitude?: number | null
  longitude?: number | null
  neighborhood?: string
  address?: string
  directionsNote?: string
  areaNote?: string
  showExactLocation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  latitude: null,
  longitude: null,
  neighborhood: '',
  address: '',
  directionsNote: '',
  areaNote: '',
  showExactLocation: false,
})

const mapContainer = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let circle: Circle | null = null

const initMap = async () => {
  if (!mapContainer.value || !props.latitude || !props.longitude) return

  try {
    const L = await import('leaflet')
    
    map = L.map(mapContainer.value, {
      zoomControl: false,
      attributionControl: false,
    }).setView([props.latitude, props.longitude], 15)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    if (props.showExactLocation) {
      const icon = L.divIcon({
        html: `<div class="w-8 h-8 bg-accent-700 rounded-full flex items-center justify-center text-white shadow-lg">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </div>`,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })
      
      L.marker([props.latitude, props.longitude], { icon }).addTo(map)
    } else {
      circle = L.circle([props.latitude, props.longitude], {
        radius: 300,
        color: '#5C6B45',
        fillColor: '#5C6B45',
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map)

      map.fitBounds(circle.getBounds())
    }
  } catch (error) {
    console.error('Error initializing map:', error)
  }
}

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

watch(() => [props.latitude, props.longitude], () => {
  if (map) {
    map.remove()
    map = null
  }
  nextTick(() => {
    initMap()
  })
})
</script>

<style scoped>
.custom-marker {
  background: transparent;
  border: none;
}
</style>
