<template>
  <AppShell>
    <div class="max-w-3xl mx-auto px-4 py-8">
      <!-- Encabezado -->
      <div class="mb-8">
        <router-link
          :to="`/${locale}/panel/properties`"
          class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3"
        >
          <ChevronLeft class="w-4 h-4" />
          {{ t('hostPanel.backToProperties') }}
        </router-link>
        <h1 class="text-3xl text-display text-primary-700 mb-2">
          {{ t('hostPanel.newPropertyTitle') }}
        </h1>
        <p class="text-gray-600">{{ t('hostPanel.newPropertySubtitle') }}</p>
      </div>

      <form class="space-y-6" @submit.prevent="submit">
        <!-- Información básica -->
        <section class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('hostPanel.sectionBasics') }}
          </h2>

          <div class="space-y-4">
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldTitle') }} <span class="text-accent-700">*</span>
              </label>
              <input
                id="title"
                v-model="form.title"
                type="text"
                maxlength="150"
                class="input-base"
                :class="{ 'border-accent-500': errors.title }"
                :placeholder="t('hostPanel.fieldTitlePlaceholder')"
              />
              <p v-if="errors.title" class="mt-1 text-xs text-accent-700">{{ errors.title }}</p>
              <p v-else class="mt-1 text-xs text-gray-400">{{ form.title.length }}/150</p>
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldDescription') }}
              </label>
              <textarea
                id="description"
                v-model="form.description"
                rows="5"
                class="input-base resize-y"
                :placeholder="t('hostPanel.fieldDescriptionPlaceholder')"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('hostPanel.fieldCity') }} <span class="text-accent-700">*</span>
                </label>
                <input
                  id="city"
                  v-model="form.city"
                  type="text"
                  list="cities-list"
                  maxlength="100"
                  class="input-base"
                  :class="{ 'border-accent-500': errors.city }"
                  :placeholder="t('hostPanel.fieldCityPlaceholder')"
                />
                <datalist id="cities-list">
                  <option v-for="c in cities" :key="c" :value="c" />
                </datalist>
                <p v-if="errors.city" class="mt-1 text-xs text-accent-700">{{ errors.city }}</p>
              </div>

              <div>
                <label for="propertyType" class="block text-sm font-medium text-gray-700 mb-1">
                  {{ t('hostPanel.fieldPropertyType') }} <span class="text-accent-700">*</span>
                </label>
                <select id="propertyType" v-model="form.propertyType" class="input-base">
                  <option v-for="tipo in propertyTypes" :key="tipo" :value="tipo">
                    {{ t(`propertyType.${tipo}`) }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Capacidad -->
        <section class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-1">
            {{ t('hostPanel.sectionCapacity') }}
          </h2>
          <p class="text-sm text-gray-500 mb-4">{{ t('hostPanel.sectionCapacityHint') }}</p>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label for="maxGuests" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldMaxGuests') }}
              </label>
              <input id="maxGuests" v-model.number="form.maxGuests" type="number" min="1" max="50" class="input-base" />
            </div>
            <div>
              <label for="bedrooms" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldBedrooms') }}
              </label>
              <input id="bedrooms" v-model.number="form.bedrooms" type="number" min="0" max="20" class="input-base" />
            </div>
            <div>
              <label for="beds" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldBeds') }}
              </label>
              <input id="beds" v-model.number="form.beds" type="number" min="0" max="50" class="input-base" />
            </div>
            <div>
              <label for="bathrooms" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldBathrooms') }}
              </label>
              <input id="bathrooms" v-model.number="form.bathrooms" type="number" min="0" max="20" step="0.5" class="input-base" />
              <p class="mt-1 text-xs text-gray-400">{{ t('hostPanel.fieldBathroomsHint') }}</p>
            </div>
            <div>
              <label for="areaM2" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldArea') }}
              </label>
              <input id="areaM2" v-model.number="form.areaM2" type="number" min="1" class="input-base" placeholder="—" />
            </div>
          </div>
        </section>

        <!-- Precio y política -->
        <section class="card p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('hostPanel.sectionPricing') }}
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="price" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldPrice') }} <span class="text-accent-700">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">$</span>
                <input
                  id="price"
                  v-model.number="form.basePricePerNight"
                  type="number"
                  min="1"
                  step="1000"
                  class="input-base pl-8"
                  :class="{ 'border-accent-500': errors.basePricePerNight }"
                  placeholder="200000"
                />
              </div>
              <p v-if="errors.basePricePerNight" class="mt-1 text-xs text-accent-700">
                {{ errors.basePricePerNight }}
              </p>
              <p v-else-if="precioFormateado" class="mt-1 text-xs text-gray-500">
                {{ precioFormateado }} {{ t('hostPanel.perNight') }}
              </p>
              <p v-else class="mt-1 text-xs text-gray-400">{{ t('hostPanel.fieldPriceHint') }}</p>
            </div>

            <div>
              <label for="cancellationPolicy" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('hostPanel.fieldCancellationPolicy') }}
              </label>
              <select id="cancellationPolicy" v-model="form.cancellationPolicy" class="input-base">
                <option v-for="p in cancellationPolicies" :key="p" :value="p">
                  {{ t(`cancellationPolicy.${p}`) }}
                </option>
              </select>
              <p class="mt-1 text-xs text-gray-400">
                {{ t(`cancellationPolicyHint.${form.cancellationPolicy}`) }}
              </p>
            </div>
          </div>
        </section>

        <!-- Aviso sobre los siguientes pasos -->
        <div class="flex gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100">
          <Info class="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
          <p class="text-sm text-primary-900">
            {{ t('hostPanel.draftNotice') }}
          </p>
        </div>

        <!-- Acciones -->
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <router-link :to="`/${locale}/panel/properties`" class="btn-ghost text-center">
            {{ t('common.cancel') }}
          </router-link>
          <button type="submit" :disabled="isSaving" class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isSaving ? t('common.loading') : t('hostPanel.createProperty') }}
          </button>
        </div>
      </form>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { ChevronLeft, Info } from 'lucide-vue-next'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const locale = computed(() => (route.params.locale as string) || 'es')

const propertyTypes = ['apartamento', 'apartaestudio', 'casa', 'suite', 'habitacion'] as const
const cancellationPolicies = ['flexible', 'moderada', 'estricta'] as const

/** Ciudades sugeridas. Se cargan de la API; si falla, quedan las de operación. */
const cities = ref<string[]>(['Medellín', 'Cartagena'])

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

const errors = reactive<Record<string, string>>({})
const isSaving = ref(false)

const formatCOP = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)

/** Vista previa del precio; vacía mientras el campo no tenga un valor válido. */
const precioFormateado = computed(() =>
  form.basePricePerNight && form.basePricePerNight > 0 ? formatCOP(form.basePricePerNight) : ''
)

/** Validación en cliente equivalente a la del backend (zod). */
const validar = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k])

  if (!form.title.trim()) {
    errors.title = t('hostPanel.errorTitleRequired')
  }
  if (!form.city.trim()) {
    errors.city = t('hostPanel.errorCityRequired')
  }
  if (!form.basePricePerNight || form.basePricePerNight <= 0) {
    errors.basePricePerNight = t('hostPanel.errorPriceRequired')
  }

  return Object.keys(errors).length === 0
}

const submit = async () => {
  if (!validar()) {
    toast.warning(t('hostPanel.errorCheckFields'))
    return
  }

  isSaving.value = true
  try {
    // Solo se envían los campos con valor: el backend los tiene como opcionales
    // y enviar undefined haría fallar la validación de tipos.
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

    const { data } = await api.post('/properties', payload)

    toast.success(t('hostPanel.propertyCreated'))
    // Se entra directo al editor, en la pestaña de fotos: sin imágenes la
    // propiedad no se puede publicar, así que es el siguiente paso natural.
    const nuevaId = data?.property?.id ?? data?.id
    if (nuevaId) {
      router.push(`/${locale.value}/panel/properties/${nuevaId}/edit?tab=photos`)
    } else {
      router.push(`/${locale.value}/panel/properties`)
    }
  } catch (error: any) {
    console.error('Error creando propiedad:', error)
    const detalle = error?.response?.data?.error
    toast.error(detalle || t('toast.genericError'))
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/cities')
    if (Array.isArray(data?.cities) && data.cities.length) {
      cities.value = data.cities.map((c: any) => (typeof c === 'string' ? c : c.city ?? c.name))
    }
  } catch {
    // Sin conexión al catálogo de ciudades se conservan las sugeridas;
    // el campo es de texto libre, así que no bloquea la creación.
  }
})
</script>
