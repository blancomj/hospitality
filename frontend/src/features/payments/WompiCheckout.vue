<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('payments.checkout') }}
        </h1>
        <p class="text-gray-600">
          {{ t('payments.processing') }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div class="h-32 skeleton rounded-2xl" />
        <div class="h-12 skeleton rounded-xl" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 class="text-red-700 font-medium mb-2">{{ t('payments.failed') }}</h3>
        <p class="text-red-600 text-sm">{{ error }}</p>
        <button
          @click="retryPayment"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {{ t('common.next') }}
        </button>
      </div>

      <!-- Payment Summary -->
      <div v-else-if="paymentIntent" class="space-y-6">
        <!-- Summary Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('payments.summary') }}</h3>
          
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.property') }}</span>
              <span class="font-medium">{{ propertyTitle }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.dates') }}</span>
              <span class="font-medium">{{ startDate }} - {{ endDate }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('payments.nights') }}</span>
              <span class="font-medium">{{ nights }}</span>
            </div>
            <div class="border-t border-gray-100 pt-3 mt-3">
              <div class="flex justify-between">
                <span class="text-lg font-semibold">{{ t('property.total') }}</span>
                <span class="text-lg font-bold text-primary-600">
                  {{ formatPrice(paymentIntent.amount) }} COP
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Wompi Widget Container -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('payments.paymentMethod') }}</h3>
          <div id="wompi-widget" class="min-h-[400px]" />
        </div>

        <!-- Cancel -->
        <button
          @click="goBack"
          class="w-full text-center text-gray-500 hover:text-gray-700 py-2"
        >
          {{ t('payments.cancelAndReturn') }}
        </button>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import { useCurrency } from '@/composables/useCurrency'
import { PaymentIntent, PaymentIntentResponse } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { formatPrice } = useCurrency()

const locale = computed(() => (route.params.locale as string) || 'es')
const paymentIntent = ref<PaymentIntent | null>(null)
const propertyTitle = ref('')
const startDate = ref('')
const endDate = ref('')
const nights = ref(0)
const isLoading = ref(true)
const error = ref('')

const bookingId = computed(() => parseInt(route.params.bookingId as string, 10))

const fetchPaymentIntent = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const response = await api.post<PaymentIntentResponse>(`/bookings/${bookingId.value}/payment-intent`)
    paymentIntent.value = response.data.paymentIntent
    propertyTitle.value = route.query.title as string || 'Property'
    startDate.value = route.query.startDate as string || ''
    endDate.value = route.query.endDate as string || ''
    nights.value = parseInt(route.query.nights as string || '1', 10)

    // Initialize Wompi widget
    initWompiWidget(response.data.paymentIntent, response.data.publicKey)
  } catch (err: any) {
    error.value = err.response?.data?.error || t('errors.generic')
    toast.error(t('errors.generic'))
  } finally {
    isLoading.value = false
  }
}

const initWompiWidget = (intent: PaymentIntent, publicKey: string) => {
  // Load Wompi script
  const script = document.createElement('script')
  script.src = 'https://checkout.wompi.co/wompi-checkout.js'
  script.async = true
  script.onload = () => {
    const widget = new (window as any).WompiCheckout({
      publicKey,
      reference: intent.reference,
      amount: intent.amount,
      currency: intent.currency,
      onSuccess: () => {
        toast.success(t('payments.success'))
        router.push(`/${locale.value}/bookings/${bookingId.value}/payment-success`)
      },
      onFailed: () => {
        toast.error(t('payments.failed'))
        router.push(`/${locale.value}/bookings/${bookingId.value}/payment-failed`)
      },
      onPending: () => {
        toast.info(t('payments.processing'))
        router.push(`/${locale.value}/bookings/${bookingId.value}`)
      },
    })
    widget.mount('#wompi-widget')
  }
  document.head.appendChild(script)
}

const retryPayment = () => {
  fetchPaymentIntent()
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  fetchPaymentIntent()
})
</script>
