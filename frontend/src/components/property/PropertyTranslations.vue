<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-medium text-gray-900">Traducciones</h3>
      <button
        @click="showForm = !showForm"
        class="text-sm text-primary-600 hover:text-primary-700"
      >
        {{ showForm ? 'Cancelar' : 'Agregar traducción' }}
      </button>
    </div>

    <!-- Existing translations -->
    <div v-if="translations.length > 0" class="space-y-4 mb-6">
      <div
        v-for="translation in translations"
        :key="translation.locale"
        class="flex items-start justify-between p-4 bg-gray-50 rounded-xl"
      >
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-medium text-gray-500 uppercase">{{ translation.locale }}</span>
            <span
              v-if="translation.isAutoTranslated"
              class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full"
            >
              Automática
            </span>
          </div>
          <p class="font-medium text-gray-900">{{ translation.title }}</p>
          <p v-if="translation.description" class="text-sm text-gray-600 mt-1 line-clamp-2">
            {{ translation.description }}
          </p>
        </div>
        <button
          @click="deleteTranslation(translation.locale)"
          class="ml-4 text-red-500 hover:text-red-700"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div v-else class="text-center py-4 text-gray-500">
      No hay traducciones disponibles
    </div>

    <!-- Add/Edit form -->
    <div v-if="showForm" class="border-t border-gray-100 pt-6">
      <h4 class="font-medium text-gray-900 mb-4">Nueva traducción</h4>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
          <select
            v-model="formLocale"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            v-model="formTitle"
            type="text"
            maxlength="150"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="Título de la propiedad"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            v-model="formDescription"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            placeholder="Descripción de la propiedad"
          />
        </div>

        <div class="flex gap-3">
          <button
            @click="saveTranslation"
            :disabled="!formTitle || isSaving"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Guardando...' : 'Guardar' }}
          </button>
          <button
            @click="showForm = false"
            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import api from '@/lib/api'
import { useToast } from 'vue-toastification'

interface Translation {
  locale: string
  title: string
  description: string | null
  isAutoTranslated: boolean
}

const props = defineProps<{
  propertyId: number
}>()

const toast = useToast()

const translations = ref<Translation[]>([])
const showForm = ref(false)
const isSaving = ref(false)

const formLocale = ref('en')
const formTitle = ref('')
const formDescription = ref('')

const fetchTranslations = async () => {
  try {
    const response = await api.get(`/properties/${props.propertyId}/translations`)
    translations.value = response.data.translations
  } catch (error) {
    console.error('Error fetching translations:', error)
  }
}

const saveTranslation = async () => {
  if (!formTitle.value) return
  
  isSaving.value = true
  try {
    await api.put(`/properties/${props.propertyId}/translations/${formLocale.value}`, {
      title: formTitle.value,
      description: formDescription.value || null,
    })
    
    toast.success('Traducción guardada')
    showForm.value = false
    formTitle.value = ''
    formDescription.value = ''
    await fetchTranslations()
  } catch (error) {
    console.error('Error saving translation:', error)
    toast.error('Error al guardar traducción')
  } finally {
    isSaving.value = false
  }
}

const deleteTranslation = async (locale: string) => {
  if (!confirm('¿Eliminar esta traducción?')) return
  
  try {
    await api.delete(`/properties/${props.propertyId}/translations/${locale}`)
    toast.success('Traducción eliminada')
    await fetchTranslations()
  } catch (error) {
    console.error('Error deleting translation:', error)
    toast.error('Error al eliminar traducción')
  }
}

watch(showForm, (value) => {
  if (value) {
    // Set default locale to the first non-Spanish locale
    const existingLocales = translations.value.map(t => t.locale)
    formLocale.value = existingLocales.includes('en') ? 'es' : 'en'
  }
})

onMounted(() => {
  fetchTranslations()
})
</script>
