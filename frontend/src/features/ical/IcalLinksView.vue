<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          Sincronización iCal
        </h1>
        <p class="text-gray-600">
          Conecta con Airbnb, Booking.com u otros calendarios
        </p>
      </div>

      <!-- Export section -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Exportar calendario</h2>
        <p class="text-gray-600 mb-4">
          Copia este enlace y pégalo en Airbnb/Booking.com para bloquear las fechas reservadas.
        </p>
        <div class="flex items-center gap-2">
          <input
            :value="exportUrl"
            readonly
            class="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
          />
          <button
            @click="copyExportUrl"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Copiar
          </button>
        </div>
      </div>

      <!-- Import section -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Importar calendario</h2>
        <p class="text-gray-600 mb-4">
          Pega el enlace iCal de Airbnb/Booking.com para sincronizar disponibilidad.
        </p>
        
        <div class="flex gap-4">
          <input
            v-model="newSourceName"
            type="text"
            placeholder="Nombre (ej: Airbnb)"
            class="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <input
            v-model="newIcalUrl"
            type="url"
            placeholder="URL del calendario iCal"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <button
            @click="addLink"
            :disabled="!newSourceName || !newIcalUrl || isAdding"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {{ isAdding ? 'Agregando...' : 'Agregar' }}
          </button>
        </div>
      </div>

      <!-- Links list -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Enlaces importados</h2>

        <!-- Loading -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 2" :key="i" class="h-16 skeleton rounded-xl" />
        </div>

        <!-- Links -->
        <div v-else-if="links.length > 0" class="space-y-4">
          <div
            v-for="link in links"
            :key="link.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
          >
            <div>
              <p class="font-medium text-gray-900">{{ link.source_name }}</p>
              <p class="text-sm text-gray-500 truncate max-w-md">{{ link.ical_url }}</p>
              <p class="text-xs text-gray-400 mt-1">
                Última sincronización: {{ link.last_synced_at ? formatDate(link.last_synced_at) : 'Nunca' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  link.sync_status === 'synced' ? 'bg-green-100 text-green-700' :
                  link.sync_status === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                ]"
              >
                {{ link.sync_status === 'synced' ? 'Sincronizado' : link.sync_status === 'error' ? 'Error' : 'Pendiente' }}
              </span>
              <button
                @click="removeLink(link.id)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-8">
          <Calendar class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500">No hay enlaces iCal importados</p>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Calendar, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const route = useRoute()
const toast = useToast()

interface IcalLink {
  id: number
  property_id: number
  source_name: string
  ical_url: string
  last_synced_at: string | null
  sync_status: string
  error_message: string | null
  created_at: string
}

const links = ref<IcalLink[]>([])
const isLoading = ref(true)
const isAdding = ref(false)
const newSourceName = ref('')
const newIcalUrl = ref('')

const propertyId = computed(() => parseInt(route.params.id as string, 10))

const exportUrl = computed(() => {
  return `${window.location.origin}/api/v1/properties/${propertyId.value}/ical/EXPORT_TOKEN.ics`
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const copyExportUrl = () => {
  navigator.clipboard.writeText(exportUrl.value)
  toast.success('URL copiada al portapapeles')
}

const fetchLinks = async () => {
  isLoading.value = true
  try {
    const response = await api.get(`/properties/${propertyId.value}/ical-links`)
    links.value = response.data.links
  } catch (error) {
    console.error('Error fetching iCal links:', error)
    toast.error('Error al cargar enlaces iCal')
  } finally {
    isLoading.value = false
  }
}

const addLink = async () => {
  if (!newSourceName.value || !newIcalUrl.value) return

  isAdding.value = true
  try {
    await api.post(`/properties/${propertyId.value}/ical-links`, {
      sourceName: newSourceName.value,
      icalUrl: newIcalUrl.value,
    })
    toast.success('Enlace iCal agregado')
    newSourceName.value = ''
    newIcalUrl.value = ''
    await fetchLinks()
  } catch (error) {
    console.error('Error adding iCal link:', error)
    toast.error('Error al agregar enlace iCal')
  } finally {
    isAdding.value = false
  }
}

const removeLink = async (linkId: number) => {
  try {
    await api.delete(`/properties/${propertyId.value}/ical-links/${linkId}`)
    toast.success('Enlace iCal eliminado')
    links.value = links.value.filter(l => l.id !== linkId)
  } catch (error) {
    console.error('Error removing iCal link:', error)
    toast.error('Error al eliminar enlace iCal')
  }
}

onMounted(() => {
  fetchLinks()
})
</script>
