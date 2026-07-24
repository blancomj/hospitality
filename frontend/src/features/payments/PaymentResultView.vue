<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <!-- Esperando al webhook -->
      <template v-if="state === 'polling'">
        <div class="w-20 h-20 rounded-full bg-cream-200 flex items-center justify-center mx-auto mb-6">
          <Loader2 class="w-10 h-10 text-primary-600 animate-spin" />
        </div>
        <h1 class="text-2xl font-serif text-primary-700 mb-3">
          {{ t('payments.verifying') }}
        </h1>
        <p class="text-gray-600 max-w-md mx-auto">
          {{ t('payments.verifyingDescription') }}
        </p>
      </template>

      <!-- Confirmada -->
      <template v-else-if="state === 'confirmed'">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle class="w-10 h-10 text-green-600" />
        </div>
        <h1 class="text-3xl font-serif text-primary-700 mb-4">{{ t('payments.success') }}</h1>
        <p class="text-gray-600 mb-8">{{ t('payments.successDescription') }}</p>
        <div class="space-y-3">
          <button class="btn-primary w-full" @click="goToBooking">
            {{ t('payments.viewBooking') }}
          </button>
          <button class="w-full text-gray-500 hover:text-gray-700 py-2" @click="goHome">
            {{ t('common.back') }}
          </button>
        </div>
      </template>

      <!-- Aún pendiente (típico de PSE) -->
      <template v-else-if="state === 'pending'">
        <div class="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock class="w-10 h-10 text-gold-600" />
        </div>
        <h1 class="text-2xl font-serif text-primary-700 mb-4">
          {{ t('payments.stillPending') }}
        </h1>
        <p class="text-gray-600 mb-8 max-w-md mx-auto">
          {{ t('payments.stillPendingDescription') }}
        </p>
        <button class="btn-primary w-full" @click="goToBooking">
          {{ t('payments.viewBooking') }}
        </button>
      </template>

      <!-- No prosperó -->
      <template v-else>
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle class="w-10 h-10 text-red-600" />
        </div>
        <h1 class="text-2xl font-serif text-primary-700 mb-4">{{ t('payments.failed') }}</h1>
        <p class="text-gray-600 mb-8 max-w-md mx-auto">
          {{ t('payments.failedDescription') }}
        </p>
        <div class="space-y-3">
          <button class="btn-primary w-full" @click="retry">
            {{ t('common.retry') }}
          </button>
          <button class="w-full text-gray-500 hover:text-gray-700 py-2" @click="goToBooking">
            {{ t('payments.viewBooking') }}
          </button>
        </div>
      </template>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-vue-next'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const locale = computed(() => (route.params.locale as string) || 'es')
const bookingId = computed(() => parseInt(route.params.bookingId as string, 10))

type State = 'polling' | 'confirmed' | 'pending' | 'failed'
const state = ref<State>('polling')

/**
 * Wompi devuelve al huésped a esta pantalla antes —a veces bastante antes— de
 * que llegue el webhook que confirma la reserva. Por eso no se decide nada con
 * lo que diga la URL: se consulta el estado real en el backend hasta que
 * cambie, con un tope para no dejar la pantalla girando indefinidamente.
 */
const MAX_ATTEMPTS = 12
const INTERVAL_MS = 2500

let attempts = 0
let timer: ReturnType<typeof setTimeout> | undefined
let cancelled = false

const poll = async () => {
  if (cancelled) return

  attempts += 1

  try {
    const { data } = await api.get(`/bookings/${bookingId.value}`)
    const status = data.booking?.status

    if (status === 'confirmed') {
      state.value = 'confirmed'
      return
    }

    if (status === 'cancelled' || status === 'expired') {
      state.value = 'failed'
      return
    }
  } catch {
    // Un fallo puntual de red no debe interrumpir el sondeo.
  }

  if (attempts >= MAX_ATTEMPTS) {
    // Sigue en pending_payment: puede ser un PSE en curso. No es un fallo.
    state.value = 'pending'
    return
  }

  timer = setTimeout(poll, INTERVAL_MS)
}

const goToBooking = () => {
  router.push({
    name: 'booking-detail',
    params: { locale: locale.value, id: bookingId.value },
  })
}

const goHome = () => {
  router.push({ name: 'home', params: { locale: locale.value } })
}

const retry = () => {
  router.push({
    name: 'payment',
    params: { locale: locale.value, bookingId: bookingId.value },
  })
}

onMounted(poll)

onUnmounted(() => {
  cancelled = true
  if (timer) clearTimeout(timer)
})
</script>
