<template>
  <div class="space-y-6">
    <!-- Exportar -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.icalExportTitle') }}</h2>
      <p class="text-sm text-gray-500 mb-4">{{ t('hostPanel.icalExportHint') }}</p>

      <div v-if="exportUrl" class="flex flex-col sm:flex-row gap-2">
        <input :value="exportUrl" readonly class="input-base flex-1 text-sm font-mono" @focus="($event.target as HTMLInputElement).select()" />
        <button class="btn-primary whitespace-nowrap" @click="copiar">
          <Check v-if="copiado" class="w-4 h-4 inline mr-1" />
          {{ copiado ? t('hostPanel.copied') : t('common.copy') }}
        </button>
      </div>

      <div v-else class="flex gap-3 p-4 rounded-xl bg-gold-50 border border-gold-200">
        <AlertTriangle class="w-5 h-5 text-gold-700 shrink-0 mt-0.5" />
        <p class="text-sm text-gold-900">{{ t('hostPanel.icalNoToken') }}</p>
      </div>
    </div>

    <!-- Importar -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.icalImportTitle') }}</h2>
      <p class="text-sm text-gray-500 mb-4">{{ t('hostPanel.icalImportHint') }}</p>

      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="nuevoNombre"
          type="text"
          maxlength="60"
          class="input-base sm:w-48"
          :placeholder="t('hostPanel.icalSourcePlaceholder')"
        />
        <input
          v-model="nuevaUrl"
          type="url"
          class="input-base flex-1"
          :placeholder="t('hostPanel.icalUrlPlaceholder')"
          @keyup.enter="agregar"
        />
        <button
          :disabled="!nuevoNombre.trim() || !nuevaUrl.trim() || isAdding"
          class="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          @click="agregar"
        >
          {{ isAdding ? t('common.loading') : t('hostPanel.icalAdd') }}
        </button>
      </div>
    </div>

    <!-- Enlaces importados -->
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('hostPanel.icalLinksTitle') }}</h2>

      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 2" :key="i" class="h-16 skeleton rounded-xl" />
      </div>

      <div v-else-if="links.length" class="space-y-3">
        <div
          v-for="link in links"
          :key="link.id"
          class="flex items-start justify-between gap-3 p-4 rounded-xl bg-cream-50"
        >
          <div class="min-w-0">
            <p class="font-medium text-gray-900">{{ link.source_name || link.source }}</p>
            <p class="text-sm text-gray-500 truncate">{{ link.ical_url }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ t('hostPanel.icalLastSync') }}:
              {{ link.last_synced_at ? formatoFecha(link.last_synced_at) : t('hostPanel.icalNever') }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="px-2 py-1 rounded text-xs font-medium" :class="claseEstado(link.sync_status)">
              {{ t(`hostPanel.icalStatus.${estadoNormalizado(link.sync_status)}`) }}
            </span>
            <button
              type="button"
              class="p-2 rounded-lg text-accent-700 hover:bg-accent-50"
              :aria-label="t('common.delete')"
              @click="eliminar(link.id)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <Calendar class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-sm text-gray-400">{{ t('hostPanel.icalNoLinks') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { Trash2, Calendar, Check, AlertTriangle } from 'lucide-vue-next'
import api from '@/lib/api'

const props = defineProps<{
  propertyId: string
  /** Token opaco de exportación, viene de la propiedad ya cargada. */
  exportToken?: string | null
}>()

const { t, locale: idioma } = useI18n()
const toast = useToast()

interface IcalLink {
  id: number
  source?: string
  source_name?: string
  ical_url: string
  last_synced_at: string | null
  sync_status?: string | null
}

const links = ref<IcalLink[]>([])
const nuevoNombre = ref('')
const nuevaUrl = ref('')
const isLoading = ref(true)
const isAdding = ref(false)
const copiado = ref(false)

/**
 * URL pública del calendario de esta propiedad.
 *
 * La versión anterior de esta pantalla construía la URL con el literal
 * 'EXPORT_TOKEN' en lugar del token real, así que el enlace que el propietario
 * copiaba y pegaba en Airbnb o Booking nunca funcionaba.
 */
const exportUrl = computed(() =>
  props.exportToken
    ? `${window.location.origin}/api/v1/properties/${props.propertyId}/ical/${props.exportToken}.ics`
    : ''
)

const copiar = async () => {
  try {
    await navigator.clipboard.writeText(exportUrl.value)
    copiado.value = true
    toast.success(t('hostPanel.icalCopied'))
    setTimeout(() => (copiado.value = false), 2000)
  } catch {
    toast.error(t('toast.genericError'))
  }
}

const formatoFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString(idioma.value === 'en' ? 'en-US' : 'es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const estadoNormalizado = (estado?: string | null) => {
  if (estado === 'synced') return 'synced'
  if (estado === 'error') return 'error'
  return 'pending'
}

const claseEstado = (estado?: string | null) => {
  switch (estadoNormalizado(estado)) {
    case 'synced': return 'bg-green-100 text-green-700'
    case 'error': return 'bg-accent-100 text-accent-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const cargar = async () => {
  isLoading.value = true
  try {
    const { data } = await api.get(`/properties/${props.propertyId}/ical-links`)
    links.value = data.links ?? []
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isLoading.value = false
  }
}

const agregar = async () => {
  if (!nuevoNombre.value.trim() || !nuevaUrl.value.trim()) return
  isAdding.value = true
  try {
    await api.post(`/properties/${props.propertyId}/ical-links`, {
      sourceName: nuevoNombre.value.trim(),
      icalUrl: nuevaUrl.value.trim(),
    })
    toast.success(t('hostPanel.icalAdded'))
    nuevoNombre.value = ''
    nuevaUrl.value = ''
    await cargar()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isAdding.value = false
  }
}

const eliminar = async (linkId: number) => {
  if (!window.confirm(t('hostPanel.icalConfirmDelete'))) return
  try {
    await api.delete(`/properties/${props.propertyId}/ical-links/${linkId}`)
    links.value = links.value.filter((l) => l.id !== linkId)
    toast.success(t('hostPanel.icalDeleted'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  }
}

onMounted(cargar)
</script>
