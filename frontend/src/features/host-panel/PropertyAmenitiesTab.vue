<template>
  <div class="space-y-6">
    <div class="card p-6">
      <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('hostPanel.amenitiesTitle') }}</h2>
        <span class="text-sm text-gray-500">
          {{ t('hostPanel.amenitiesSelected', { n: seleccionadas.size }) }}
        </span>
      </div>
      <p class="text-sm text-gray-500 mb-6">{{ t('hostPanel.amenitiesHint') }}</p>

      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-24 skeleton rounded-xl" />
      </div>

      <p v-else-if="!categorias.length" class="text-sm text-gray-400 text-center py-8">
        {{ t('hostPanel.amenitiesCatalogEmpty') }}
      </p>

      <div v-else class="space-y-6">
        <section v-for="cat in categorias" :key="cat.id">
          <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            {{ t(`amenityCategory.${cat.id}`) }}
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="item in cat.items"
              :key="item.id"
              class="rounded-xl border transition-colors"
              :class="seleccionadas.has(item.id)
                ? 'border-primary-500 bg-primary-50'
                : 'border-cream-300 hover:border-primary-300'"
            >
              <label class="flex items-center gap-3 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  class="shrink-0"
                  :checked="seleccionadas.has(item.id)"
                  @change="alternar(item)"
                />
                <AmenityIcon :name="item.icon" clase="w-4 h-4 text-primary-600 shrink-0" />
                <span class="text-sm text-gray-800 flex-1">{{ item.name }}</span>
              </label>

              <!-- Detalle opcional (velocidad del wifi, precio del parqueadero…) -->
              <div v-if="item.allows_detail && seleccionadas.has(item.id)" class="px-3 pb-3 pl-12">
                <input
                  type="text"
                  maxlength="120"
                  class="input-base py-2 text-sm"
                  :placeholder="t('hostPanel.amenityDetailPlaceholder')"
                  :value="detalles[item.id] || ''"
                  @input="detalles[item.id] = ($event.target as HTMLInputElement).value"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="flex justify-end">
      <button :disabled="isSaving || isLoading" class="btn-primary disabled:opacity-50" @click="guardar">
        {{ isSaving ? t('common.loading') : t('common.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AmenityIcon from '@/components/base/AmenityIcon.vue'

const props = defineProps<{ propertyId: string }>()

const { t } = useI18n()
const toast = useToast()

interface ItemCatalogo {
  id: number
  name: string
  icon: string
  allows_detail: boolean | number
  category: string
}
interface Categoria {
  id: string
  items: ItemCatalogo[]
}

const categorias = ref<Categoria[]>([])
const seleccionadas = reactive(new Set<number>())
const detalles = reactive<Record<number, string>>({})
const isLoading = ref(true)
const isSaving = ref(false)

/** Orden de presentación; las categorías desconocidas se añaden al final. */
const ORDEN = [
  'basicos', 'cocina', 'lavanderia', 'espacios',
  'edificio', 'familia', 'seguridad', 'accesibilidad', 'politicas',
]

const alternar = (item: ItemCatalogo) => {
  if (seleccionadas.has(item.id)) {
    seleccionadas.delete(item.id)
    delete detalles[item.id]
  } else {
    seleccionadas.add(item.id)
  }
}

const cargar = async () => {
  isLoading.value = true
  try {
    const [catRes, propRes] = await Promise.all([
      api.get('/properties/catalog/amenities'),
      api.get(`/properties/${props.propertyId}/amenities`),
    ])

    // El backend devuelve el catálogo agrupado por categoría.
    const agrupado: Record<string, ItemCatalogo[]> =
      catRes.data.catalog ?? catRes.data.amenities ?? catRes.data ?? {}

    const claves = Object.keys(agrupado).filter((k) => Array.isArray(agrupado[k]) && agrupado[k].length)
    claves.sort((a, b) => {
      const ia = ORDEN.indexOf(a)
      const ib = ORDEN.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    categorias.value = claves.map((k) => ({ id: k, items: agrupado[k] }))

    // Marcar las que ya tiene la propiedad
    const actuales: any[] = propRes.data.amenities ?? []
    seleccionadas.clear()
    for (const a of actuales) {
      seleccionadas.add(a.id)
      if (a.detail) detalles[a.id] = a.detail
    }
  } catch (error: any) {
    console.error('Error cargando amenidades:', error)
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isLoading.value = false
  }
}

const guardar = async () => {
  isSaving.value = true
  try {
    const payload = {
      amenities: Array.from(seleccionadas).map((id) => ({
        amenityId: id,
        detail: detalles[id]?.trim() || null,
      })),
    }
    await api.put(`/properties/${props.propertyId}/amenities`, payload)
    toast.success(t('hostPanel.changesSaved'))
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isSaving.value = false
  }
}

onMounted(cargar)
</script>
