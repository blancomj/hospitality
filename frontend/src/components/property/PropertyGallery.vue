<template>
  <div class="relative">
    <!-- Galería mosaico -->
    <div class="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden aspect-[2/1]">
      <!-- Imagen principal (2 columnas) -->
      <div class="col-span-2 row-span-2 relative cursor-pointer" @click="openLightbox(0)">
        <img 
          v-if="photos[0]"
          :src="photos[0].thumbnail_url || photos[0].url"
          :alt="alt"
          class="w-full h-full object-cover hover:brightness-95 transition-all"
          loading="lazy"
        />
        <div v-else class="w-full h-full bg-cream-200 flex items-center justify-center">
          <svg class="w-12 h-12 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <!-- Imágenes secundarias (4 en cuadrícula) -->
      <div 
        v-for="(photo, index) in secondaryPhotos" 
        :key="photo.id"
        class="relative cursor-pointer"
        @click="openLightbox(index + 1)"
      >
        <img 
          :src="photo.thumbnail_url || photo.url"
          :alt="`${alt} ${index + 2}`"
          class="w-full h-full object-cover hover:brightness-95 transition-all"
          loading="lazy"
        />
        <!-- Botón "Ver todas" en la última imagen -->
        <div 
          v-if="index === 3 && photos.length > 5"
          class="absolute inset-0 bg-black/40 flex items-center justify-center"
        >
          <span class="text-white font-medium">+{{ photos.length - 5 }} más</span>
        </div>
      </div>

      <!-- Placeholder si no hay suficientes fotos -->
      <template v-if="secondaryPhotos.length < 4">
        <div 
          v-for="i in (4 - secondaryPhotos.length)" 
          :key="`placeholder-${i}`"
          class="bg-cream-200"
        />
      </template>
    </div>

    <!-- Videos integrados -->
    <div v-if="videos && videos.length > 0" class="mt-4">
      <h3 class="text-lg font-semibold text-gray-900 mb-3">Videos</h3>
      <div class="grid grid-cols-2 gap-4">
        <div 
          v-for="video in videos" 
          :key="video.id"
          class="relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-gray-900"
          @click="playVideo(video)"
        >
          <!-- Thumbnail o embed -->
          <iframe 
            v-if="video.source !== 'upload'"
            :src="getEmbedUrl(video)"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <img 
            v-else
            :src="video.thumbnail_url ?? ''"
            :alt="`Video ${video.id}`"
            class="w-full h-full object-cover"
          />
          
          <!-- Badge de play -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox (simplificado - se puede mejorar con Swiper) -->
    <div 
      v-if="lightboxOpen" 
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      @click="closeLightbox"
    >
      <button 
        class="absolute top-4 right-4 text-white w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
        @click="closeLightbox"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <img 
        :src="currentPhoto?.url"
        :alt="alt"
        class="max-w-[90vw] max-h-[90vh] object-contain"
        @click.stop
      />

      <!-- Navegación -->
      <button 
        v-if="currentPhotoIndex > 0"
        class="absolute left-4 text-white w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
        @click.stop="prevPhoto"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button 
        v-if="currentPhotoIndex < photos.length - 1"
        class="absolute right-4 text-white w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
        @click.stop="nextPhoto"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Contador -->
      <div class="absolute bottom-4 text-white text-sm">
        {{ currentPhotoIndex + 1 }} / {{ photos.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PropertyPhoto, PropertyVideo } from '@/types'

interface Props {
  photos?: PropertyPhoto[]
  videos?: PropertyVideo[]
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  photos: () => [],
  videos: () => [],
  alt: 'Propiedad',
})

const lightboxOpen = ref(false)
const currentPhotoIndex = ref(0)

const secondaryPhotos = computed(() => {
  return props.photos.slice(1, 5)
})

const currentPhoto = computed(() => {
  return props.photos[currentPhotoIndex.value]
})

const openLightbox = (index: number) => {
  currentPhotoIndex.value = index
  lightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxOpen.value = false
  document.body.style.overflow = ''
}

const prevPhoto = () => {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--
  }
}

const nextPhoto = () => {
  if (currentPhotoIndex.value < props.photos.length - 1) {
    currentPhotoIndex.value++
  }
}

const getEmbedUrl = (video: PropertyVideo): string => {
  if (video.source === 'youtube') {
    const videoId = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&?#]+)/)?.[1]
    return `https://www.youtube.com/embed/${videoId}`
  }
  if (video.source === 'vimeo') {
    const videoId = video.url.match(/vimeo\.com\/(\d+)/)?.[1]
    return `https://player.vimeo.com/video/${videoId}`
  }
  return video.url
}

const playVideo = (video: PropertyVideo) => {
  if (video.source === 'upload') {
    window.open(video.url, '_blank')
  }
}
</script>
