<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4"
    @click.self="close"
  >
    <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md p-6">
      <h2 class="text-xl font-serif text-primary-700 mb-4">
        {{ t('bookings.cancelTitle') }}
      </h2>

      <!-- Cargando cotización -->
      <div v-if="isLoadingQuote" class="space-y-3 mb-6">
        <div class="h-4 w-3/4 skeleton" />
        <div class="h-4 w-1/2 skeleton" />
        <div class="h-16 skeleton rounded-xl" />
      </div>

      <!-- No se pudo cotizar -->
      <div v-else-if="quoteError" class="mb-6">
        <p class="text-sm text-red-600">{{ quoteError }}</p>
      </div>

      <!-- Cotización -->
      <div v-else-if="quote" class="mb-6 space-y-4">
        <p class="text-sm text-gray-600">{{ t('bookings.cancelWarning') }}</p>

        <div class="rounded-xl border border-cream-200 bg-cream-50 p-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('bookings.cancelPolicy') }}</span>
            <span class="font-medium capitalize">{{ quote.policy_applied }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('bookings.daysUntilCheckin') }}</span>
            <span class="font-medium">{{ quote.days_until_checkin }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">{{ t('property.total') }}</span>
            <span class="font-medium">{{ formatCOP(Number(quote.total_amount)) }}</span>
          </div>
          <div
            class="flex justify-between pt-2 border-t border-cream-200 text-base font-semibold"
          >
            <span>{{ t('bookings.refundAmount') }}</span>
            <span :class="refundIsZero ? 'text-gray-500' : 'text-primary-700'">
              {{ formatCOP(Number(quote.refund_amount)) }}
              <span class="text-xs font-normal text-gray-400">
                ({{ Number(quote.refund_percentage) }}%)
              </span>
            </span>
          </div>
        </div>

        <!-- El matiz importante: aprobado ≠ inmediato -->
        <p
          v-if="quote.refund_outcome === 'requires_approval'"
          class="text-xs text-gray-500 bg-gold-50 border border-gold-200 rounded-xl px-3 py-2"
        >
          {{ t('bookings.refundRequiresApproval') }}
        </p>
        <p
          v-else-if="quote.refund_outcome === 'not_eligible'"
          class="text-xs text-accent-800 bg-accent-50 border border-accent-200 rounded-xl px-3 py-2"
        >
          {{ t('bookings.refundNotEligible') }}
        </p>
        <p
          v-else
          class="text-xs text-gray-500 bg-cream-100 border border-cream-200 rounded-xl px-3 py-2"
        >
          {{ t('bookings.refundNoPayment') }}
        </p>

        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">
            {{ t('bookings.cancelReason') }}
          </label>
          <textarea
            v-model="reason"
            rows="2"
            maxlength="500"
            class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="t('bookings.cancelReasonPlaceholder')"
          />
        </div>
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 py-2.5 border border-cream-300 rounded-xl text-sm text-gray-700 hover:bg-cream-50"
          :disabled="isCancelling"
          @click="close"
        >
          {{ t('bookings.keepBooking') }}
        </button>
        <button
          class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
          :disabled="isCancelling || isLoadingQuote || Boolean(quoteError)"
          @click="confirm"
        >
          <span v-if="isCancelling">{{ t('common.loading') }}</span>
          <span v-else>{{ t('bookings.actions.cancel') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'

interface CancellationQuote {
  booking_id: number
  current_status: string
  can_be_cancelled: number | boolean
  total_amount: number | string
  policy_applied: string
  days_until_checkin: number
  refund_percentage: number | string
  refund_amount: number | string
  has_payment: number | boolean
  refund_outcome: 'no_payment' | 'not_eligible' | 'requires_approval'
}

interface Props {
  open: boolean
  bookingId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  cancelled: []
}>()

const { t } = useI18n()
const toast = useToast()

const quote = ref<CancellationQuote | null>(null)
const isLoadingQuote = ref(false)
const quoteError = ref('')
const isCancelling = ref(false)
const reason = ref('')

const refundIsZero = computed(() => Number(quote.value?.refund_amount ?? 0) === 0)

const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)

const fetchQuote = async (bookingId: number) => {
  isLoadingQuote.value = true
  quoteError.value = ''
  quote.value = null

  try {
    const { data } = await api.get(`/bookings/${bookingId}/cancellation-quote`)
    quote.value = data.quote
  } catch (error: any) {
    quoteError.value = error.response?.data?.error || t('errors.generic')
  } finally {
    isLoadingQuote.value = false
  }
}

// La cotización depende de la fecha actual, así que se pide cada vez que se
// abre el diálogo en lugar de cachearla.
watch(
  () => [props.open, props.bookingId],
  ([open, bookingId]) => {
    if (open && typeof bookingId === 'number') {
      reason.value = ''
      fetchQuote(bookingId)
    }
  },
  { immediate: true }
)

const close = () => {
  if (isCancelling.value) return
  emit('close')
}

const confirm = async () => {
  if (!props.bookingId) return

  isCancelling.value = true
  try {
    const { data } = await api.post(`/bookings/${props.bookingId}/cancel`, {
      reason: reason.value.trim() || 'Cancelado por el usuario',
    })

    const refundStatus = data.cancellation?.refund_status

    if (refundStatus === 'pending') {
      toast.success(t('bookings.cancelledRefundQueued'))
    } else {
      toast.success(t('bookings.cancelledNoRefund'))
    }

    emit('cancelled')
    emit('close')
  } catch (error: any) {
    toast.error(error.response?.data?.error || t('errors.generic'))
  } finally {
    isCancelling.value = false
  }
}
</script>
