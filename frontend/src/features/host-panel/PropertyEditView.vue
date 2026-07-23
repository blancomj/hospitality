<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Encabezado -->
      <div class="mb-6">
        <router-link
          :to="`/${locale}/panel/properties`"
          class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3"
        >
          <ChevronLeft class="w-4 h-4" />
          {{ t('hostPanel.backToProperties') }}
        </router-link>

        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-3xl text-display text-primary-700 mb-1">
              {{ form.title || t('hostPanel.editPropertyTitle') }}
            </h1>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" :class="statusClass">
              {{ t(`hostPanel.status${capitalize(status)}`) }}
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <!-- Vista previa pública: útil para comprobar cómo va quedando
                 sin tener que salir al listado. -->
            <router-link
              :to="`/${locale}/property/${propertyId}`"
              target="_blank"
              class="btn-ghost text-sm border inline-flex items-center gap-1.5"
            >
              <ExternalLink class="w-4 h-4" />
              {{ t('hostPanel.preview') }}
            </router-link>

            <button
              v-if="status !== 'published'"
              :disabled="!puedePublicar || isPublishing"
              class="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :title="!puedePublicar ? t('hostPanel.needPhotosToPublish') : ''"
              @click="cambiarEstado('published')"
            >
              {{ t('hostPanel.publish') }}
            </button>
            <button
              v-else
              :disabled="isPublishing"
              class="btn-ghost text-sm border"
              @click="cambiarEstado('paused')"
            >
              {{ t('hostPanel.pause') }}
            </button>
          </div>
        </div>

        <p v-if="!puedePublicar && status !== 'published'" class="mt-2 text-sm text-gray-500">
          {{ t('hostPanel.needPhotosToPublish') }}
        </p>
      </div>

      <!-- Pestañas -->
      <div class="flex gap-1 border-b border-cream-300 mb-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors"
          :class="activeTab === tab.id
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.id"
        >
          {{ t(tab.label) }}
          <span v-if="tab.id === 'photos' && photos.length" class="ml-1 text-xs text-gray-400">
            ({{ photos.length }})
          </span>
        </button>
      </div>

      <div v-if="isLoading" class="space-y-4">
        <div class="h-40 skeleton rounded-2xl" />
        <div class="h-40 skeleton rounded-2xl" />
      </div>

      <template v-else>
        <!-- ============ DATOS BÁSICOS ============ -->
        <section v-show="activeTab === 'basics'" class="space-y-6">
          <div class="card p-6 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldTitle') }}
              </label>
              <input v-model="form.title" type="text" maxlength="150" class="input-base" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldDescription') }}
              </label>
              <textarea v-model="form.description" rows="5" class="input-base resize-y" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('hostPanel.fieldCity') }}
                </label>
                <input v-model="form.city" type="text" maxlength="100" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('hostPanel.fieldPropertyType') }}
                </label>
                <select v-model="form.propertyType" class="input-base">
                  <option v-for="tipo in propertyTypes" :key="tipo" :value="tipo">
                    {{ t(`propertyType.${tipo}`) }}
                  </option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldMaxGuests') }}</label>
                <input v-model.number="form.maxGuests" type="number" min="1" max="50" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldBedrooms') }}</label>
                <input v-model.number="form.bedrooms" type="number" min="0" max="20" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldBeds') }}</label>
                <input v-model.number="form.beds" type="number" min="0" max="50" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldBathrooms') }}</label>
                <input v-model.number="form.bathrooms" type="number" min="0" max="20" step="0.5" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldArea') }}</label>
                <input v-model.number="form.areaM2" type="number" min="1" class="input-base" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldPrice') }}</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                  <input v-model.number="form.basePricePerNight" type="number" min="1" step="1000" class="input-base pl-8" />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldCancellationPolicy') }}</label>
                <select v-model="form.cancellationPolicy" class="input-base">
                  <option v-for="p in cancellationPolicies" :key="p" :value="p">
                    {{ t(`cancellationPolicy.${p}`) }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button :disabled="isSaving" class="btn-primary disabled:opacity-50" @click="guardarBasicos">
              {{ isSaving ? t('common.loading') : t('common.save') }}
            </button>
          </div>

          <!-- Zona de riesgo: eliminar.
               Solo tiene sentido ofrecerlo en borradores; para el resto la vía
               correcta es pausar, que retira la propiedad del catálogo sin
               destruir el historial de reservas y pagos. -->
          <div class="rounded-2xl border border-accent-200 bg-accent-50/50 p-6">
            <h3 class="text-base font-semibold text-accent-900 mb-1">
              {{ t('hostPanel.dangerZone') }}
            </h3>

            <template v-if="status === 'draft'">
              <p class="text-sm text-accent-800 mb-4">{{ t('hostPanel.deleteDraftHint') }}</p>
              <button
                :disabled="isDeleting"
                class="px-4 py-2 rounded-xl border border-accent-300 text-accent-800 text-sm font-medium hover:bg-accent-100 transition-colors disabled:opacity-50"
                @click="eliminarPropiedad"
              >
                {{ isDeleting ? t('common.loading') : t('hostPanel.deleteProperty') }}
              </button>
            </template>

            <template v-else>
              <p class="text-sm text-accent-800 mb-4">{{ t('hostPanel.cannotDeleteHint') }}</p>
              <button
                v-if="status === 'published'"
                :disabled="isPublishing"
                class="px-4 py-2 rounded-xl border border-accent-300 text-accent-800 text-sm font-medium hover:bg-accent-100 transition-colors"
                @click="cambiarEstado('paused')"
              >
                {{ t('hostPanel.pause') }}
              </button>
            </template>
          </div>
        </section>

        <!-- ============ FOTOS ============ -->
        <section v-show="activeTab === 'photos'" class="space-y-6">
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.photosTitle') }}</h2>
            <p class="text-sm text-gray-500 mb-4">{{ t('hostPanel.photosHint') }}</p>

            <!-- Zona de carga -->
            <label
              class="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
              :class="isDragging ? 'border-primary-500 bg-primary-50' : 'border-cream-300 hover:border-primary-400'"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                class="hidden"
                @change="onFileSelect"
              />
              <ImagePlus class="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p class="text-sm font-medium text-gray-700">{{ t('hostPanel.dropPhotos') }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ t('hostPanel.photoFormats') }}</p>
            </label>

            <!-- Progreso de subida -->
            <div v-if="uploading.length" class="mt-4 space-y-2">
              <div v-for="u in uploading" :key="u.name" class="flex items-center gap-3 text-sm">
                <div class="flex-1 truncate text-gray-600">{{ u.name }}</div>
                <div class="w-32 h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div class="h-full bg-primary-500 transition-all" :style="{ width: u.progress + '%' }" />
                </div>
              </div>
            </div>

            <!-- Cuadrícula de fotos -->
            <div v-if="photos.length" class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div
                v-for="(foto, i) in photos"
                :key="foto.id"
                class="relative aspect-[4/3] rounded-xl overflow-hidden bg-cream-100 group"
              >
                <img :src="mediaUrl(foto.thumbnail_url || foto.url)" :alt="`Foto ${i + 1}`" class="w-full h-full object-cover" loading="lazy" />

                <span
                  v-if="i === 0"
                  class="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary-700 text-white text-xs font-medium"
                >
                  {{ t('hostPanel.coverPhoto') }}
                </span>

                <div class="absolute inset-x-0 bottom-0 p-2 flex gap-1 justify-between items-center bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <!-- Reordenamiento: el endpoint acepta el orden completo, no
                       solo la portada. Estos controles permiten decidir también
                       qué foto va segunda, tercera, etc. -->
                  <div class="flex gap-1">
                    <button
                      type="button"
                      :disabled="i === 0"
                      class="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      :aria-label="t('hostPanel.moveLeft')"
                      @click="mover(i, -1)"
                    >
                      <ChevronLeft class="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      :disabled="i === photos.length - 1"
                      class="p-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                      :aria-label="t('hostPanel.moveRight')"
                      @click="mover(i, 1)"
                    >
                      <ChevronRight class="w-4 h-4" />
                    </button>
                  </div>

                  <div class="flex gap-1">
                    <button
                      v-if="i !== 0"
                      type="button"
                      class="px-2 py-1 rounded-lg bg-white/90 text-xs font-medium text-gray-800 hover:bg-white"
                      @click="hacerPortada(i)"
                    >
                      {{ t('hostPanel.makeCover') }}
                    </button>
                    <button
                      type="button"
                      class="p-1.5 rounded-lg bg-white/90 text-accent-700 hover:bg-white"
                      :aria-label="t('common.delete')"
                      @click="eliminarFoto(foto.id)"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-gray-400 text-center py-8">
              {{ t('hostPanel.noPhotosYet') }}
            </p>
          </div>
        </section>

        <!-- ============ UBICACIÓN ============ -->
        <section v-show="activeTab === 'location'" class="space-y-6">
          <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.locationTitle') }}</h2>
            <p class="text-sm text-gray-500 mb-4">{{ t('hostPanel.locationHint') }}</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldAddress') }}</label>
                <input v-model="ubicacion.address" type="text" maxlength="255" class="input-base" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldNeighborhood') }}</label>
                <input v-model="ubicacion.neighborhood" type="text" maxlength="100" class="input-base" />
              </div>
            </div>

            <!-- Mapa -->
            <div class="relative rounded-xl overflow-hidden border border-cream-300 mb-2">
              <div ref="mapContainer" class="h-72 w-full" />
            </div>
            <p class="text-xs text-gray-500 mb-4">{{ t('hostPanel.mapHint') }}</p>

            <label class="flex items-start gap-3 p-3 rounded-xl bg-cream-50 cursor-pointer mb-4">
              <input v-model="ubicacion.showExactLocation" type="checkbox" class="mt-0.5" />
              <span class="text-sm">
                <span class="font-medium text-gray-800">{{ t('hostPanel.showExactLocation') }}</span>
                <span class="block text-gray-500 text-xs mt-0.5">{{ t('hostPanel.showExactLocationHint') }}</span>
              </span>
            </label>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldDirections') }}</label>
                <textarea v-model="ubicacion.directionsNote" rows="3" class="input-base resize-y" :placeholder="t('hostPanel.fieldDirectionsPlaceholder')" />
                <p class="mt-1 text-xs text-gray-400">{{ t('hostPanel.fieldDirectionsHint') }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('hostPanel.fieldAreaNote') }}</label>
                <textarea v-model="ubicacion.areaNote" rows="3" class="input-base resize-y" :placeholder="t('hostPanel.fieldAreaNotePlaceholder')" />
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <button :disabled="isSaving || !ubicacion.latitude" class="btn-primary disabled:opacity-50" @click="guardarUbicacion">
              {{ isSaving ? t('common.loading') : t('common.save') }}
            </button>
          </div>
        </section>
        <!-- ============ AMENIDADES ============ -->
        <PropertyAmenitiesTab v-if="activeTab === 'amenities'" :property-id="propertyId" />

        <!-- ============ VIDEOS ============ -->
        <PropertyVideosTab v-if="activeTab === 'videos'" :property-id="propertyId" />

        <!-- ============ DISPONIBILIDAD ============ -->
        <PropertyAvailabilityTab v-if="activeTab === 'availability'" :property-id="propertyId" />

        <!-- ============ SINCRONIZACIÓN iCAL ============ -->
        <PropertyIcalTab v-if="activeTab === 'ical'" :property-id="propertyId" :export-token="icalToken" />
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, ExternalLink } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import PropertyAmenitiesTab from './PropertyAmenitiesTab.vue'
import PropertyVideosTab from './PropertyVideosTab.vue'
import PropertyAvailabilityTab from './PropertyAvailabilityTab.vue'
import PropertyIcalTab from './PropertyIcalTab.vue'
import { mediaUrl } from '@/lib/media'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const locale = computed(() => (route.params.locale as string) || 'es')
const propertyId = computed(() => route.params.id as string)

const propertyTypes = ['apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion'] as const
const cancellationPolicies = ['flexible', 'moderada', 'estricta'] as const

const tabs = [
  { id: 'basics', label: 'hostPanel.tabBasics' },
  { id: 'photos', label: 'hostPanel.tabPhotos' },
  { id: 'location', label: 'hostPanel.tabLocation' },
  { id: 'amenities', label: 'hostPanel.tabAmenities' },
  { id: 'videos', label: 'hostPanel.tabVideos' },
  { id: 'availability', label: 'hostPanel.tabAvailability' },
  { id: 'ical', label: 'hostPanel.tabIcal' },
]
const activeTab = ref<string>((route.query.tab as string) || 'basics')

const isLoading = ref(true)
const isSaving = ref(false)
const isPublishing = ref(false)
const isDeleting = ref(false)
const status = ref<'draft' | 'published' | 'paused'>('draft')
const icalToken = ref<string | null>(null)

/**
 * Detección de cambios sin guardar.
 *
 * El editor guarda por secciones, así que es fácil escribir en «Datos», cambiar
 * de pestaña y perderlo todo sin darse cuenta. Se compara el estado actual
 * contra una instantánea tomada al cargar (y renovada tras cada guardado).
 */
const instantanea = ref('')
const tomarInstantanea = () => {
  instantanea.value = JSON.stringify({ f: form, u: ubicacion })
}
const hayCambiosSinGuardar = computed(
  () => instantanea.value !== '' && instantanea.value !== JSON.stringify({ f: form, u: ubicacion })
)

interface Foto {
  id: number
  url: string
  thumbnail_url: string | null
}
const photos = ref<Foto[]>([])

const form = reactive({
  title: '',
  description: '',
  city: '',
  propertyType: 'apartamento' as (typeof propertyTypes)[number],
  maxGuests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  areaM2: undefined as number | undefined,
  basePricePerNight: undefined as number | undefined,
  cancellationPolicy: 'moderada' as (typeof cancellationPolicies)[number],
})

const ubicacion = reactive({
  address: '',
  neighborhood: '',
  latitude: null as number | null,
  longitude: null as number | null,
  showExactLocation: false,
  directionsNote: '',
  areaNote: '',
})

/** Una propiedad sin fotos no debería publicarse: no tendría nada que mostrar. */
const puedePublicar = computed(() => photos.value.length > 0)

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const statusClass = computed(() => {
  switch (status.value) {
    case 'published': return 'bg-green-100 text-green-800'
    case 'paused': return 'bg-yellow-100 text-yellow-800'
    default: return 'bg-gray-100 text-gray-600'
  }
})

// ---------- Carga ----------
const cargar = async () => {
  isLoading.value = true
  try {
    const { data } = await api.get(`/properties/${propertyId.value}`)
    const p = data.property ?? data

    form.title = p.title ?? ''
    form.description = p.description ?? ''
    form.city = p.city ?? ''
    form.propertyType = p.property_type ?? 'apartamento'
    form.maxGuests = p.max_guests ?? 2
    form.bedrooms = p.bedrooms ?? 1
    form.beds = p.beds ?? 1
    form.bathrooms = Number(p.bathrooms ?? 1)
    form.areaM2 = p.area_m2 ?? undefined
    form.basePricePerNight = Number(p.base_price_per_night ?? 0) || undefined
    form.cancellationPolicy = p.cancellation_policy ?? 'moderada'

    ubicacion.address = p.address ?? ''
    ubicacion.neighborhood = p.neighborhood ?? ''
    ubicacion.latitude = p.latitude != null ? Number(p.latitude) : null
    ubicacion.longitude = p.longitude != null ? Number(p.longitude) : null
    ubicacion.showExactLocation = !!p.show_exact_location
    ubicacion.directionsNote = p.directions_note ?? ''
    ubicacion.areaNote = p.area_note ?? ''

    photos.value = Array.isArray(p.photos) ? p.photos.filter(Boolean) : []
    status.value = p.status ?? 'draft'
    icalToken.value = p.ical_export_token ?? null
    tomarInstantanea()
  } catch (error: any) {
    console.error('Error cargando propiedad:', error)
    toast.error(error?.response?.data?.error || t('toast.genericError'))
    router.push(`/${locale.value}/panel/properties`)
  } finally {
    isLoading.value = false
  }
}

// ---------- Guardar básicos ----------
const guardarBasicos = async () => {
  if (!form.title.trim() || !form.city.trim() || !form.basePricePerNight) {
    toast.warning(t('hostPanel.errorCheckFields'))
    return
  }
  isSaving.value = true
  try {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      city: form.city.trim(),
      propertyType: form.propertyType,
      basePricePerNight: form.basePricePerNight,
      cancellationPolicy: form.cancellationPolicy,
      maxGuests: form.maxGuests,
      bedrooms: form.bedrooms,
      beds: form.beds,
      bathrooms: form.bathrooms,
    }
    if (form.description.trim()) payload.description = form.description.trim()
    if (form.areaM2) payload.areaM2 = form.areaM2

    await api.patch(`/properties/${propertyId.value}`, payload)
    tomarInstantanea()
    toast.success(t('hostPanel.changesSaved'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isSaving.value = false
  }
}

// ---------- Fotos ----------
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploading = ref<{ name: string; progress: number }[]>([])

const MAX_BYTES = 10 * 1024 * 1024 // el backend rechaza por encima de 10 MB

const subirArchivos = async (files: File[]) => {
  const validos = files.filter((f) => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      toast.error(t('hostPanel.errorPhotoFormat', { name: f.name }))
      return false
    }
    if (f.size > MAX_BYTES) {
      toast.error(t('hostPanel.errorPhotoSize', { name: f.name }))
      return false
    }
    return true
  })

  for (const file of validos) {
    const entrada = reactive({ name: file.name, progress: 0 })
    uploading.value.push(entrada)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await api.post(`/properties/${propertyId.value}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) entrada.progress = Math.round((e.loaded * 100) / e.total)
        },
      })
      const foto = data.photo
      photos.value.push({
        id: foto.id,
        url: foto.url,
        thumbnail_url: foto.thumbnailUrl ?? foto.thumbnail_url ?? null,
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('hostPanel.errorPhotoUpload', { name: file.name }))
    } finally {
      uploading.value = uploading.value.filter((u) => u !== entrada)
    }
  }

  if (validos.length) toast.success(t('hostPanel.photosUploaded'))
}

const onFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) subirArchivos(Array.from(input.files))
  input.value = ''
}

const onDrop = (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files?.length) subirArchivos(Array.from(e.dataTransfer.files))
}

const eliminarFoto = async (photoId: number) => {
  if (!window.confirm(t('hostPanel.confirmDeletePhoto'))) return
  try {
    await api.delete(`/properties/${propertyId.value}/photos/${photoId}`)
    photos.value = photos.value.filter((f) => f.id !== photoId)
    toast.success(t('hostPanel.photoDeleted'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  }
}

/** Persiste el orden actual; revierte la vista si el servidor rechaza. */
const guardarOrden = async (nuevoOrden: Foto[], previo: Foto[], mensaje: string) => {
  photos.value = nuevoOrden
  try {
    await api.patch(`/properties/${propertyId.value}/photos/reorder`, {
      photoIds: nuevoOrden.map((f) => f.id),
    })
    toast.success(mensaje)
  } catch (error: any) {
    photos.value = previo
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  }
}

const hacerPortada = async (index: number) => {
  const previo = photos.value
  const copia = [...previo]
  const [elegida] = copia.splice(index, 1)
  copia.unshift(elegida)
  await guardarOrden(copia, previo, t('hostPanel.coverUpdated'))
}

/** Mueve una foto una posición a izquierda o derecha. */
const mover = async (index: number, delta: number) => {
  const destino = index + delta
  if (destino < 0 || destino >= photos.value.length) return
  const previo = photos.value
  const copia = [...previo]
  ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
  await guardarOrden(copia, previo, t('hostPanel.orderUpdated'))
}

// ---------- Ubicación (Leaflet) ----------
const mapContainer = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

// Centro por defecto: Cartagena, una de las ciudades de operación.
const CENTRO_DEFECTO: [number, number] = [10.3910, -75.4794]

const iconoMarcador = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#722F37;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const colocarMarcador = (lat: number, lng: number) => {
  if (!map) return
  ubicacion.latitude = Number(lat.toFixed(7))
  ubicacion.longitude = Number(lng.toFixed(7))
  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng], { icon: iconoMarcador, draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const p = marker!.getLatLng()
      colocarMarcador(p.lat, p.lng)
    })
  }
}

const iniciarMapa = async () => {
  await nextTick()
  if (!mapContainer.value || map) return

  const centro: [number, number] =
    ubicacion.latitude != null && ubicacion.longitude != null
      ? [ubicacion.latitude, ubicacion.longitude]
      : CENTRO_DEFECTO

  map = L.map(mapContainer.value).setView(centro, ubicacion.latitude != null ? 16 : 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map)

  if (ubicacion.latitude != null && ubicacion.longitude != null) {
    colocarMarcador(ubicacion.latitude, ubicacion.longitude)
  }

  map.on('click', (e: L.LeafletMouseEvent) => colocarMarcador(e.latlng.lat, e.latlng.lng))

  // El contenedor está oculto hasta abrir la pestaña; Leaflet necesita
  // recalcular su tamaño cuando se hace visible.
  setTimeout(() => map?.invalidateSize(), 100)
}

watch(activeTab, (tab) => {
  if (tab === 'location') {
    if (!map) iniciarMapa()
    else setTimeout(() => map?.invalidateSize(), 100)
  }
})

const guardarUbicacion = async () => {
  if (ubicacion.latitude == null || ubicacion.longitude == null) {
    toast.warning(t('hostPanel.errorPickLocation'))
    return
  }
  isSaving.value = true
  try {
    await api.patch(`/properties/${propertyId.value}/location`, {
      latitude: ubicacion.latitude,
      longitude: ubicacion.longitude,
      address: ubicacion.address.trim() || undefined,
      neighborhood: ubicacion.neighborhood.trim() || undefined,
      showExactLocation: ubicacion.showExactLocation,
      directionsNote: ubicacion.directionsNote.trim() || undefined,
      areaNote: ubicacion.areaNote.trim() || undefined,
    })
    tomarInstantanea()
    toast.success(t('hostPanel.changesSaved'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isSaving.value = false
  }
}

// ---------- Publicar / pausar ----------
const cambiarEstado = async (nuevo: 'published' | 'paused') => {
  if (nuevo === 'published' && !puedePublicar.value) {
    toast.warning(t('hostPanel.needPhotosToPublish'))
    return
  }
  isPublishing.value = true
  try {
    await api.patch(`/properties/${propertyId.value}/status`, { status: nuevo })
    status.value = nuevo
    toast.success(nuevo === 'published' ? t('hostPanel.propertyPublished') : t('hostPanel.propertyPaused'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isPublishing.value = false
  }
}

// Aviso al navegar dentro de la aplicación
const eliminarPropiedad = async () => {
  if (!window.confirm(t('hostPanel.confirmDeleteProperty'))) return
  isDeleting.value = true
  try {
    await api.delete(`/properties/${propertyId.value}`)
    // Evita que el guard de cambios sin guardar interrumpa la salida.
    instantanea.value = ''
    toast.success(t('hostPanel.propertyDeleted'))
    router.push(`/${locale.value}/panel/properties`)
  } catch (error: any) {
    // El backend responde 409 con un mensaje explicando por qué no se puede.
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isDeleting.value = false
  }
}

onBeforeRouteLeave(() => {
  if (!hayCambiosSinGuardar.value) return true
  return window.confirm(t('hostPanel.unsavedWarning'))
})

// Aviso al cerrar o recargar la pestaña del navegador
const avisarAlSalir = (e: BeforeUnloadEvent) => {
  if (!hayCambiosSinGuardar.value) return
  e.preventDefault()
  e.returnValue = ''
}

onMounted(async () => {
  window.addEventListener('beforeunload', avisarAlSalir)
  await cargar()
  if (activeTab.value === 'location') iniciarMapa()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', avisarAlSalir)
  map?.remove()
  map = null
})
</script>
