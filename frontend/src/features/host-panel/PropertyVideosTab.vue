<template>
  <div class="space-y-6">
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.videosTitle') }}</h2>
      <p class="text-sm text-gray-500 mb-5">{{ t('hostPanel.videosHint') }}</p>

      <!-- Añadir por enlace -->
      <div class="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          v-model="nuevaUrl"
          type="url"
          class="input-base flex-1"
          :placeholder="t('hostPanel.videoUrlPlaceholder')"
          @keyup.enter="agregar"
        />
        <button
          :disabled="isAdding || !nuevaUrl.trim() || videos.length >= MAX_VIDEOS"
          class="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          @click="agregar"
        >
          {{ isAdding ? t('common.loading') : t('hostPanel.addVideo') }}
        </button>
      </div>

      <p v-if="videos.length >= MAX_VIDEOS" class="text-xs text-gray-500 -mt-4 mb-4">
        {{ t('hostPanel.videoLimitReached', { n: MAX_VIDEOS }) }}
      </p>

      <!-- Lista -->
      <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="i in 2" :key="i" class="aspect-video skeleton rounded-xl" />
      </div>

      <div v-else-if="videos.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="v in videos"
          :key="v.id"
          class="relative aspect-video rounded-xl overflow-hidden bg-gray-900 group"
        >
          <img
            v-if="miniatura(v)"
            :src="miniatura(v)!"
            :alt="t('hostPanel.videoPreview')"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-900">
            <Video class="w-8 h-8 text-white/70" />
          </div>

          <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs capitalize">
            {{ v.source }}
          </span>

          <div class="absolute inset-x-0 bottom-0 p-2 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent">
            <a
              :href="v.url"
              target="_blank"
              rel="noopener"
              class="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white"
              :aria-label="t('hostPanel.openVideo')"
            >
              <ExternalLink class="w-4 h-4" />
            </a>
            <button
              type="button"
              class="p-1.5 rounded-lg bg-white/90 text-accent-700 hover:bg-white"
              :aria-label="t('common.delete')"
              @click="eliminar(v.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <p v-else class="text-sm text-gray-400 text-center py-8">
        {{ t('hostPanel.noVideosYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { Trash2, ExternalLink, Video } from 'lucide-vue-next'
import api from '@/lib/api'

const props = defineProps<{ propertyId: string }>()

const { t } = useI18n()
const toast = useToast()

/** El backend rechaza más de 2 videos por propiedad. */
const MAX_VIDEOS = 2

interface VideoItem {
  id: number
  source: string
  url: string
  thumbnail_url?: string | null
}

const videos = ref<VideoItem[]>([])
const nuevaUrl = ref('')
const isLoading = ref(true)
const isAdding = ref(false)

const idYouTube = (url: string): string | null =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=))([\w-]{11})/)?.[1] ?? null

/** Miniatura: la guardada, o la derivada del ID de YouTube sin llamar a su API. */
const miniatura = (v: VideoItem): string | null => {
  if (v.thumbnail_url) return v.thumbnail_url
  const id = idYouTube(v.url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/** Detecta el proveedor a partir de la URL para no pedírselo al propietario. */
const detectarFuente = (url: string): 'youtube' | 'vimeo' | null => {
  if (/youtu\.?be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  return null
}

const cargar = async () => {
  isLoading.value = true
  try {
    const { data } = await api.get(`/properties/${props.propertyId}`)
    const p = data.property ?? data
    videos.value = Array.isArray(p.videos) ? p.videos.filter(Boolean) : []
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isLoading.value = false
  }
}

const agregar = async () => {
  const url = nuevaUrl.value.trim()
  if (!url) return

  const source = detectarFuente(url)
  if (!source) {
    toast.error(t('hostPanel.errorVideoProvider'))
    return
  }

  isAdding.value = true
  try {
    const { data } = await api.post(`/properties/${props.propertyId}/videos`, { source, url })
    videos.value.push(data.video)
    nuevaUrl.value = ''
    toast.success(t('hostPanel.videoAdded'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isAdding.value = false
  }
}

const eliminar = async (videoId: number) => {
  if (!window.confirm(t('hostPanel.confirmDeleteVideo'))) return
  try {
    await api.delete(`/properties/${props.propertyId}/videos/${videoId}`)
    videos.value = videos.value.filter((v) => v.id !== videoId)
    toast.success(t('hostPanel.videoDeleted'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  }
}

onMounted(cargar)
</script>
