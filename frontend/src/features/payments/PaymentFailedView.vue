<template>
  <AppShell>
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <!-- Error Icon -->
      <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle class="w-10 h-10 text-red-600" />
      </div>

      <!-- Title -->
      <h1 class="text-3xl font-serif text-primary-700 mb-4">
        {{ t('payments.failed') }}
      </h1>

      <!-- Message -->
      <p class="text-gray-600 mb-8">
        {{ t('payments.failedDescription') }}
      </p>

      <!-- Actions -->
      <div class="space-y-4">
        <button
          @click="retryPayment"
          class="w-full bg-primary-600 text-white py-3 px-6 rounded-xl hover:bg-primary-700 transition-colors"
        >
          {{ t('payments.viewBooking') }}
        </button>
        <button
          @click="goBack"
          class="w-full text-gray-500 hover:text-gray-700 py-2"
        >
          {{ t('common.back') }}
        </button>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { XCircle } from 'lucide-vue-next'
import AppShell from '@/components/base/AppShell.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const bookingId = computed(() => route.params.bookingId)
const locale = computed(() => (route.params.locale as string) || 'es')

const retryPayment = () => {
  router.push(`/${locale.value}/bookings/${bookingId.value}/payment`)
}

const goBack = () => {
  router.push(`/${locale.value}/bookings/${bookingId.value}`)
}
</script>
