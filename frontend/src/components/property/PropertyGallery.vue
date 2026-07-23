<template>
  <div class="relative">
    <!-- Galería mosaico -->
    <div class="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden aspect-[2/1]">
      <!-- Imagen principal (2 columnas) -->
      <div class="col-span-2 row-span-2 relative cursor-pointer" @click="openLightbox(0)">
        <img 
          v-if="photos[0]"
          :src="mediaUrl(photos[0].thumbnail_url || photos[0].url)"
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
          :src="mediaUrl(photo.thumbnail_url || photo.url)"
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="video in videos"
          :key="video.id"
          class="relative aspect-video rounded-xl overflow-hidden bg-gray-900"
        >
          <iframe
            v-if="activeVideoId === video.id && video.source !== 'upload'"
            :src="getEmbedUrl(video, true)"
            class="w-full h-full"
            frameborder="0"
            loading="lazy"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />

          <video
            v-else-if="activeVideoId === video.id && video.source === 'upload'"
            :src="mediaUrl(video.url)"
            class="w-full h-full object-contain bg-black"
            controls
            autoplay
            preload="metadata"
          />

          <!-- Fachada: miniatura + botón de reproducción -->
          <button
            v-else
            type="button"
            class="absolute inset-0 w-full h-full group focus-visible:ring-2 focus-visible:ring-white"
            :aria-label="`Reproducir video de ${alt}`"
            @click="playVideo(video)"
          >
            <img
              v-if="getPosterUrl(video)"
              :src="getPosterUrl(video)!"
              :alt="`Vista previa del video de ${alt}`"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900" />

            <span class="absolute inset-0 flex items-center justify-center">
              <span
                class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform duration-150 group-hover:scale-110"
              >
                <svg class="w-7 h-7 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
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
        :src="mediaUrl(currentPhoto?.url)"
        :alt="alt"
        class="max-w-[90vw] max-h-[90vh] object-contain"
        @click.stop
      />

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

      <div class="absolute bottom-4 text-white text-sm">
        {{ currentPhotoIndex + 1 }} / {{ photos.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PropertyPhoto, PropertyVideo } from '@/types'
import { mediaUrl } from '@/lib/media'

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
const activeVideoId = ref<number | string | null>(null)

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

const getYouTubeId = (url: string): string | null =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=))([\w-]{11})/)?.[1] ?? null

const getVimeoId = (url: string): string | null =>
  url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null

const getEmbedUrl = (video: PropertyVideo, autoplay = false): string => {
  const auto = autoplay ? '?autoplay=1' : ''
  if (video.source === 'youtube') {
    const id = getYouTubeId(video.url)
    return id ? `https://www.youtube-nocookie.com/embed/${id}${auto}` : ''
  }
  if (video.source === 'vimeo') {
    const id = getVimeoId(video.url)
    return id ? `https://player.vimeo.com/video/${id}${auto}` : ''
  }
  return video.url
}

const getPosterUrl = (video: PropertyVideo): string | null => {
  if (video.thumbnail_url) return video.thumbnail_url
  if (video.source === 'youtube') {
    const id = getYouTubeId(video.url)
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  }
  return null
}

const playVideo = (video: PropertyVideo) => {
  activeVideoId.value = video.id
}
</script>
