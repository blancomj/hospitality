<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('payments.checkout') }}
        </h1>
        <p class="text-gray-600">{{ t('payments.completeToConfirm') }}</p>
      </div>

      <!-- Carga -->
      <div v-if="isLoading" class="space-y-4">
        <div class="h-40 skeleton rounded-2xl" />
        <div class="h-12 skeleton rounded-xl" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 class="text-red-700 font-medium mb-2">{{ t('payments.failed') }}</h3>
        <p class="text-red-600 text-sm mb-4">{{ error }}</p>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            @click="fetchPaymentIntent"
          >
            {{ t('common.retry') }}
          </button>
          <button
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
            @click="goToBooking"
          >
            {{ t('payments.viewBooking') }}
          </button>
        </div>
      </div>

      <!-- Resumen y pago -->
      <div v-else-if="intent" class="space-y-6">
        <!-- Cuenta regresiva -->
        <div
          v-if="secondsLeft > 0"
          class="flex items-center gap-3 rounded-xl border px-4 py-3"
          :class="secondsLeft < 120
            ? 'bg-accent-50 border-accent-200 text-accent-800'
            : 'bg-gold-50 border-gold-200 text-gold-800'"
        >
          <Clock class="w-5 h-5 shrink-0" />
          <p class="text-sm">{{ t('payments.holdCountdown', { time: countdownLabel }) }}</p>
        </div>

        <div v-else class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p class="text-sm text-red-700">{{ t('payments.holdExpired') }}</p>
        </div>

        <!-- Resumen -->
        <div class="bg-white rounded-2xl shadow-sm border border-cream-200 p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('payments.summary') }}</h3>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.property') }}</span>
              <span class="font-medium text-right">{{ booking?.property_title }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.dates') }}</span>
              <span class="font-medium">
                {{ formatDate(booking?.start_date) }} – {{ formatDate(booking?.end_date) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.nights') }}</span>
              <span class="font-medium">{{ booking?.total_nights }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('bookings.guests') }}</span>
              <span class="font-medium">{{ booking?.guests_count }}</span>
            </div>

            <div class="border-t border-cream-200 pt-3 mt-3">
              <div class="flex justify-between items-baseline">
                <span class="text-lg font-semibold">{{ t('property.total') }}</span>
                <span class="text-lg font-bold text-accent-700">
                  {{ formatCOP(intent.amount) }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1 text-right">
                {{ t('payments.chargedInCOP') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Pago -->
        <div class="bg-white rounded-2xl shadow-sm border border-cream-200 p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            {{ t('payments.paymentMethod') }}
          </h3>
          <p class="text-sm text-gray-500 mb-4">{{ t('payments.methodsAvailable') }}</p>

          <button
            :disabled="secondsLeft <= 0 || isOpeningWidget"
            class="w-full py-3 bg-accent-700 hover:bg-accent-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="openWompiWidget"
          >
            <span v-if="isOpeningWidget">{{ t('common.loading') }}</span>
            <span v-else>{{ t('payments.payNow') }}</span>
          </button>
        </div>

        <button
          class="w-full text-center text-gray-500 hover:text-gray-700 py-2 text-sm"
          @click="goToBooking"
        >
          {{ t('payments.cancelAndReturn') }}
        </button>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { Clock } from 'lucide-vue-next'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import { Booking, PaymentIntent, PaymentIntentResponse } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const locale = computed(() => (route.params.locale as string) || 'es')
const bookingId = computed(() => parseInt(route.params.bookingId as string, 10))

const intent = ref<PaymentIntent | null>(null)
const publicKey = ref('')
const booking = ref<Booking | null>(null)
const isLoading = ref(true)
const isOpeningWidget = ref(false)
const error = ref('')
const secondsLeft = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | undefined

const WOMPI_WIDGET_SRC = 'https://checkout.wompi.co/widget.js'

const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (value?: string): string => {
  if (!value) return ''
  return new Date(`${String(value).substring(0, 10)}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
}

const countdownLabel = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = secondsLeft.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

const startCountdown = (expiresAt: string) => {
  const deadline = new Date(expiresAt).getTime()

  const tick = () => {
    secondsLeft.value = Math.max(0, Math.round((deadline - Date.now()) / 1000))
    if (secondsLeft.value === 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }

  tick()
  countdownTimer = setInterval(tick, 1000)
}

/**
 * Carga el widget de Wompi una sola vez.
 *
 * El script real es widget.js y expone la clase WidgetCheckout. La versión
 * anterior pedía wompi-checkout.js e instanciaba WompiCheckout: ninguno de los
 * dos existe, así que el widget nunca llegaba a abrirse.
 */
const loadWompiScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if ((window as any).WidgetCheckout) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WOMPI_WIDGET_SRC}"]`
    )

    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('script')))
      return
    }

    const script = document.createElement('script')
    script.src = WOMPI_WIDGET_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('script'))
    document.head.appendChild(script)
  })

const fetchPaymentIntent = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const [intentResponse, bookingResponse] = await Promise.all([
      api.post<PaymentIntentResponse>('/bookings/' + bookingId.value + '/payment-intent', {
        locale: locale.value,
      }),
      api.get(`/bookings/${bookingId.value}`),
    ])

    intent.value = intentResponse.data.paymentIntent
    publicKey.value = intentResponse.data.publicKey
    booking.value = bookingResponse.data.booking

    startCountdown(intent.value.expires_at)
  } catch (err: any) {
    error.value = err.response?.data?.error || t('errors.generic')
  } finally {
    isLoading.value = false
  }
}

const openWompiWidget = async () => {
  if (!intent.value) return

  isOpeningWidget.value = true

  try {
    await loadWompiScript()
  } catch {
    isOpeningWidget.value = false
    error.value = t('payments.widgetUnavailable')
    return
  }

  const WidgetCheckout = (window as any).WidgetCheckout

  if (!WidgetCheckout) {
    isOpeningWidget.value = false
    error.value = t('payments.widgetUnavailable')
    return
  }

  const checkout = new WidgetCheckout({
    currency: intent.value.currency,
    // Wompi trabaja en centavos y valida la firma contra este mismo entero.
    amountInCents: intent.value.amount_in_cents,
    reference: intent.value.reference,
    publicKey: publicKey.value,
    redirectUrl: intent.value.redirect_url,
    signature: { integrity: intent.value.integrity },
    customerData: {
      email: booking.value?.guest_email,
      fullName: booking.value?.guest_name,
      phoneNumber: booking.value?.guest_phone ?? undefined,
    },
  })

  checkout.open((result: any) => {
    isOpeningWidget.value = false
    const transaction = result?.transaction

    // El estado que manda es el del webhook, no el que ve el navegador: esta
    // respuesta sólo sirve para decidir a qué pantalla llevar al huésped.
    if (transaction?.status === 'APPROVED') {
      toast.success(t('payments.success'))
    } else if (transaction?.status === 'PENDING') {
      toast.info(t('payments.pendingNotice'))
    } else {
      toast.error(t('payments.failed'))
    }

    router.push({
      name: 'payment-result',
      params: { locale: locale.value, bookingId: bookingId.value },
      query: transaction?.id ? { id: transaction.id } : undefined,
    })
  })
}

const goToBooking = () => {
  router.push({
    name: 'booking-detail',
    params: { locale: locale.value, id: bookingId.value },
  })
}

onMounted(fetchPaymentIntent)

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
