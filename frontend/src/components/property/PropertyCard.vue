<template>
  <div class="card overflow-hidden cursor-pointer group" @click="goToProperty">
    <!-- Imagen principal con carrusel -->
    <div class="relative aspect-[4/3] overflow-hidden">
      <img 
        v-if="property.main_photo_url || property.main_thumbnail_url"
        :src="mediaUrl(property.main_thumbnail_url || property.main_photo_url)"
        :alt="property.title"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div v-else class="w-full h-full bg-cream-200 flex items-center justify-center">
        <svg class="w-12 h-12 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>

      <!-- Indicador de fotos -->
      <div v-if="photoCount > 1" class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        1/{{ photoCount }}
      </div>

      <!-- Botón de favorito -->
      <button 
        @click.stop="toggleFavorite"
        class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors"
      >
        <svg 
          class="w-5 h-5" 
          :class="isFavorite ? 'text-accent-700 fill-current' : 'text-gray-600'"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>

    <!-- Contenido -->
    <div class="p-4">
      <!-- Título y ubicación -->
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="font-semibold text-gray-900 line-clamp-1">{{ property.title }}</h3>
        <div v-if="property.avg_rating > 0" class="flex items-center gap-1 text-sm shrink-0">
          <svg class="w-4 h-4 text-gold-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span class="font-medium">{{ property.avg_rating.toFixed(1) }}</span>
          <span class="text-gray-500">({{ property.review_count }})</span>
        </div>
      </div>

      <p class="text-gray-500 text-sm mb-2">{{ property.city }}, {{ property.neighborhood }}</p>

      <!-- Capacidad -->
      <p class="text-gray-600 text-sm mb-3">
        {{ property.max_guests }} {{ property.max_guests === 1 ? t('property.guest') : t('property.guests') }} · 
        {{ property.bedrooms }} {{ property.bedrooms === 1 ? t('property.bed') : t('property.beds') }} · 
        {{ property.bathrooms }} {{ property.bathrooms === 1 ? t('property.bathroom') : t('property.bathrooms') }}
      </p>

      <!-- Precio -->
      <div class="flex items-baseline gap-1">
        <span class="text-lg font-bold text-gray-900">{{ formatPrice(property.base_price_per_night) }}</span>
        <span class="text-gray-500">{{ t('property.perNight') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '@/composables/useCurrency'
import { Property } from '@/types'
import { mediaUrl } from '@/lib/media'

interface Props {
  property: Property
  isFavorite?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFavorite: false,
})

const emit = defineEmits<{
  'toggle-favorite': [id: number]
}>()

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { formatPrice } = useCurrency()

const locale = computed(() => (route.params.locale as string) || 'es')

const photoCount = computed(() => {
  return props.property.mainPhotoUrl ? 1 : 0
})

const goToProperty = () => {
  router.push(`/${locale.value}/property/${props.property.id}`)
}

const toggleFavorite = async () => {
  emit('toggle-favorite', props.property.id)
}
</script>
