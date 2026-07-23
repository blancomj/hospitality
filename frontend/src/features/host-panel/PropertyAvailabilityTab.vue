<template>
  <div class="space-y-6">
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-1">{{ t('hostPanel.availabilityTitle') }}</h2>
      <p class="text-sm text-gray-500 mb-5">{{ t('hostPanel.availabilityHint') }}</p>

      <!-- Navegación de mes -->
      <div class="flex items-center justify-between mb-4">
        <button type="button" class="p-2 rounded-lg hover:bg-cream-100" :aria-label="t('hostPanel.prevMonth')" @click="cambiarMes(-1)">
          <ChevronLeft class="w-5 h-5 text-gray-600" />
        </button>
        <h3 class="text-base font-semibold text-gray-800 capitalize">{{ etiquetaMes }}</h3>
        <button type="button" class="p-2 rounded-lg hover:bg-cream-100" :aria-label="t('hostPanel.nextMonth')" @click="cambiarMes(1)">
          <ChevronRight class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Leyenda -->
      <div class="flex flex-wrap gap-4 text-xs text-gray-600 mb-4">
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-accent-100 border border-accent-300" />{{ t('hostPanel.legendBooked') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-gray-200 border border-gray-300" />{{ t('hostPanel.legendBlocked') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-gold-100 border border-gold-300" />{{ t('hostPanel.legendSpecialPrice') }}
        </span>
      </div>

      <div v-if="isLoading" class="h-64 skeleton rounded-xl" />

      <template v-else>
        <!-- Días de la semana -->
        <div class="grid grid-cols-7 gap-1 mb-1">
          <div v-for="d in diasSemana" :key="d" class="text-center text-xs font-medium text-gray-400 py-1">
            {{ d }}
          </div>
        </div>

        <!-- Cuadrícula -->
        <div class="grid grid-cols-7 gap-1">
          <div v-for="n in offsetInicial" :key="`hueco-${n}`" />

          <button
            v-for="dia in dias"
            :key="dia.fecha"
            type="button"
            :disabled="dia.reservado || dia.pasado"
            class="relative aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition-colors disabled:cursor-not-allowed"
            :class="claseDia(dia)"
            @click="alternarSeleccion(dia)"
          >
            <span :class="dia.pasado ? 'text-gray-300' : ''">{{ dia.numero }}</span>
            <span v-if="dia.precioEspecial" class="text-[10px] leading-none mt-0.5 text-gold-700">
              {{ compacto(dia.precioEspecial) }}
            </span>
            <span v-if="seleccion.has(dia.fecha)" class="absolute inset-0 rounded-lg ring-2 ring-primary-500 pointer-events-none" />
          </button>
        </div>
      </template>
    </div>

    <!-- Acciones sobre la selección -->
    <div v-if="seleccion.size" class="card p-5 border-l-4 border-primary-500">
      <p class="text-sm font-medium text-gray-800 mb-3">
        {{ t('hostPanel.daysSelected', { n: seleccion.size }) }}
      </p>

      <div class="flex flex-col sm:flex-row gap-3">
        <button class="btn-ghost border text-sm" @click="aplicar({ isBlocked: true })">
          {{ t('hostPanel.blockDays') }}
        </button>
        <button class="btn-ghost border text-sm" @click="aplicar({ isBlocked: false, specialPrice: null })">
          {{ t('hostPanel.unblockDays') }}
        </button>

        <div class="flex gap-2 flex-1">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
            <input
              v-model.number="precioEspecial"
              type="number"
              min="1"
              step="1000"
              class="input-base py-2 pl-7 text-sm"
              :placeholder="t('hostPanel.specialPricePlaceholder')"
            />
          </div>
          <button
            :disabled="!precioEspecial || precioEspecial <= 0"
            class="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
            @click="aplicar({ specialPrice: precioEspecial })"
          >
            {{ t('hostPanel.applyPrice') }}
          </button>
        </div>
      </div>

      <button class="mt-3 text-xs text-gray-500 hover:text-gray-700" @click="seleccion.clear()">
        {{ t('hostPanel.clearSelection') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import api from '@/lib/api'

const props = defineProps<{ propertyId: string }>()

const { t, locale: idioma } = useI18n()
const toast = useToast()

interface Dia {
  fecha: string       // YYYY-MM-DD
  numero: number
  pasado: boolean
  reservado: boolean
  bloqueado: boolean
  precioEspecial: number | null
}

const hoy = new Date()
const mesActual = ref(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
const dias = ref<Dia[]>([])
const seleccion = reactive(new Set<string>())
const precioEspecial = ref<number | undefined>(undefined)
const isLoading = ref(true)

const diasSemana = computed(() =>
  idioma.value === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
)

const etiquetaMes = computed(() =>
  mesActual.value.toLocaleDateString(idioma.value === 'en' ? 'en-US' : 'es-CO', {
    month: 'long',
    year: 'numeric',
  })
)

/** Lunes como primer día de la semana (getDay: domingo=0). */
const offsetInicial = computed(() => {
  const d = mesActual.value.getDay()
  return d === 0 ? 6 : d - 1
})

const claveMes = () =>
  `${mesActual.value.getFullYear()}-${String(mesActual.value.getMonth() + 1).padStart(2, '0')}`

const compacto = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`

const claseDia = (dia: Dia) => {
  if (dia.pasado) return 'border-cream-200 bg-cream-50'
  if (dia.reservado) return 'border-accent-300 bg-accent-100 text-accent-800'
  if (dia.bloqueado) return 'border-gray-300 bg-gray-200 text-gray-500'
  if (dia.precioEspecial) return 'border-gold-300 bg-gold-100 text-gold-800 hover:border-gold-500'
  return 'border-cream-300 bg-white hover:border-primary-400'
}

const alternarSeleccion = (dia: Dia) => {
  if (dia.reservado || dia.pasado) return
  if (seleccion.has(dia.fecha)) seleccion.delete(dia.fecha)
  else seleccion.add(dia.fecha)
}

const cambiarMes = (delta: number) => {
  const d = new Date(mesActual.value)
  d.setMonth(d.getMonth() + delta)
  mesActual.value = d
}

const cargar = async () => {
  isLoading.value = true
  seleccion.clear()
  try {
    const mes = claveMes()
    const { data } = await api.get(`/properties/${props.propertyId}/availability`, {
      params: { month: mes },
    })

    const overrides: any[] = data.overrides ?? []
    const reservas: any[] = data.bookings ?? []

    // Fechas ocupadas por reservas activas (el check-out no ocupa noche).
    const ocupadas = new Set<string>()
    for (const r of reservas) {
      const inicio = new Date(r.start_date)
      const fin = new Date(r.end_date)
      for (let d = new Date(inicio); d < fin; d.setDate(d.getDate() + 1)) {
        ocupadas.add(d.toISOString().slice(0, 10))
      }
    }

    const porFecha = new Map<string, any>()
    for (const o of overrides) {
      porFecha.set(String(o.date).slice(0, 10), o)
    }

    const anio = mesActual.value.getFullYear()
    const mesNum = mesActual.value.getMonth()
    const total = new Date(anio, mesNum + 1, 0).getDate()
    const hoyISO = new Date().toISOString().slice(0, 10)

    const lista: Dia[] = []
    for (let n = 1; n <= total; n++) {
      const fecha = `${anio}-${String(mesNum + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
      const ov = porFecha.get(fecha)
      lista.push({
        fecha,
        numero: n,
        pasado: fecha < hoyISO,
        reservado: ocupadas.has(fecha),
        bloqueado: !!ov?.is_blocked,
        precioEspecial: ov?.special_price != null ? Number(ov.special_price) : null,
      })
    }
    dias.value = lista
  } catch (error: any) {
    console.error('Error cargando disponibilidad:', error)
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  } finally {
    isLoading.value = false
  }
}

const aplicar = async (cambio: { isBlocked?: boolean; specialPrice?: number | null }) => {
  if (!seleccion.size) return
  try {
    const overrides = Array.from(seleccion).map((fecha) => ({
      date: fecha,
      ...(cambio.isBlocked !== undefined ? { isBlocked: cambio.isBlocked } : {}),
      ...(cambio.specialPrice !== undefined ? { specialPrice: cambio.specialPrice } : {}),
    }))
    await api.put(`/properties/${props.propertyId}/availability`, { overrides })
    toast.success(t('hostPanel.availabilityUpdated'))
    precioEspecial.value = undefined
    await cargar()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || t('toast.genericError'))
  }
}

watch(mesActual, cargar)
onMounted(cargar)
</script>
