<template>
  <AppShell>
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('admin.refunds.title') }}
        </h1>
        <p class="text-gray-600">{{ t('admin.refunds.subtitle') }}</p>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-6 flex-wrap">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="px-3 py-1.5 text-sm rounded-full border transition-colors"
          :class="activeFilter === filter.value
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-600 border-cream-300 hover:border-primary-300'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
          <span v-if="counts[filter.value]" class="ml-1 text-xs opacity-80">
            ({{ counts[filter.value] }})
          </span>
        </button>
      </div>

      <!-- Carga -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-36 skeleton rounded-2xl" />
      </div>

      <!-- Lista -->
      <div v-else-if="visibleRefunds.length > 0" class="space-y-4">
        <div
          v-for="refund in visibleRefunds"
          :key="refund.refund_request_id"
          class="card p-6"
        >
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <div class="flex items-center gap-3 mb-1">
                <span
                  class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="statusClasses(refund.status)"
                >
                  {{ t(`admin.refunds.status.${refund.status}`) }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ t('bookings.bookingId', { id: refund.booking_id }) }}
                </span>
              </div>
              <h3 class="font-semibold text-gray-900">{{ refund.property_title }}</h3>
              <p class="text-sm text-gray-500">
                {{ refund.guest_name }} · {{ refund.guest_email }}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p class="text-xl font-bold text-accent-700">
                {{ formatCOP(Number(refund.requested_amount)) }}
              </p>
              <p class="text-xs text-gray-500">
                {{ Number(refund.refund_percentage) }}% ·
                {{ t('bookings.cancelPolicy') }}: {{ refund.policy_applied }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4 pb-4 border-b border-cream-200">
            <div>
              <span class="text-gray-500 block text-xs">{{ t('search.startDate') }}</span>
              <span class="font-medium">{{ formatDate(refund.start_date) }}</span>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">{{ t('bookings.daysUntilCheckin') }}</span>
              <span class="font-medium">{{ refund.days_until_checkin }}</span>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">{{ t('property.total') }}</span>
              <span class="font-medium">{{ formatCOP(Number(refund.booking_total)) }}</span>
            </div>
            <div>
              <span class="text-gray-500 block text-xs">{{ t('admin.refunds.requestedAt') }}</span>
              <span class="font-medium">{{ formatDateTime(refund.created_at) }}</span>
            </div>
          </div>

          <p v-if="refund.reason" class="text-sm text-gray-600 mb-3">
            <span class="text-gray-400">{{ t('bookings.cancelReason') }}:</span>
            {{ refund.reason }}
          </p>

          <p
            v-if="refund.failure_reason"
            class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3"
          >
            {{ refund.failure_reason }}
          </p>

          <p v-if="refund.wompi_refund_id" class="text-xs text-gray-400 mb-3">
            Wompi: {{ refund.wompi_refund_id }}
          </p>

          <!-- Acciones sólo sobre lo que aún se puede decidir -->
          <div v-if="isActionable(refund.status)" class="flex gap-3">
            <button
              class="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
              :disabled="busyId === refund.refund_request_id"
              @click="approve(refund)"
            >
              <span v-if="busyId === refund.refund_request_id">
                {{ t('common.loading') }}
              </span>
              <span v-else>{{ t('admin.refunds.approve') }}</span>
            </button>
            <button
              class="flex-1 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl disabled:opacity-50"
              :disabled="busyId === refund.refund_request_id"
              @click="openReject(refund)"
            >
              {{ t('admin.refunds.reject') }}
            </button>
          </div>

          <p v-else-if="refund.reviewed_by_name" class="text-xs text-gray-400">
            {{ t('admin.refunds.reviewedBy', { name: refund.reviewed_by_name }) }}
            · {{ formatDateTime(refund.reviewed_at) }}
            <span v-if="refund.review_notes"> — {{ refund.review_notes }}</span>
          </p>
        </div>
      </div>

      <EmptyState
        v-else
        :title="t('admin.refunds.empty')"
        :description="t('admin.refunds.emptyDescription')"
      />
    </div>

    <!-- Rechazo con motivo obligatorio: queda en el registro de auditoría -->
    <div
      v-if="rejectTarget"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      @click.self="rejectTarget = null"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-xl font-serif text-primary-700 mb-4">
          {{ t('admin.refunds.rejectTitle') }}
        </h3>
        <p class="text-sm text-gray-600 mb-4">{{ t('admin.refunds.rejectHint') }}</p>

        <textarea
          v-model="rejectNotes"
          rows="3"
          maxlength="500"
          class="w-full px-3 py-2 border border-cream-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
          :placeholder="t('admin.refunds.rejectPlaceholder')"
        />

        <div class="flex gap-3">
          <button
            class="flex-1 py-2.5 border border-cream-300 rounded-xl text-sm text-gray-700 hover:bg-cream-50"
            @click="rejectTarget = null"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-50"
            :disabled="rejectNotes.trim().length < 3 || isRejecting"
            @click="confirmReject"
          >
            {{ isRejecting ? t('common.loading') : t('admin.refunds.reject') }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

interface RefundRequest {
  refund_request_id: number
  booking_id: number
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'failed'
  requested_amount: number | string
  refund_percentage: number | string
  policy_applied: string
  days_until_checkin: number
  reason: string | null
  review_notes: string | null
  failure_reason: string | null
  wompi_refund_id: string | null
  created_at: string
  reviewed_at: string | null
  start_date: string
  end_date: string
  booking_total: number | string
  property_title: string
  property_city: string
  guest_name: string
  guest_email: string
  requested_by_name: string
  reviewed_by_name: string | null
}

const { t } = useI18n()
const toast = useToast()

const refunds = ref<RefundRequest[]>([])
const isLoading = ref(true)
const activeFilter = ref('pending')
const busyId = ref<number | null>(null)
const rejectTarget = ref<RefundRequest | null>(null)
const rejectNotes = ref('')
const isRejecting = ref(false)

const filters = computed(() => [
  { value: 'pending', label: t('admin.refunds.status.pending') },
  { value: 'failed', label: t('admin.refunds.status.failed') },
  { value: 'approved', label: t('admin.refunds.status.approved') },
  { value: 'rejected', label: t('admin.refunds.status.rejected') },
  { value: 'all', label: t('admin.refunds.all') },
])

const counts = computed(() => {
  const result: Record<string, number> = { all: refunds.value.length }
  for (const refund of refunds.value) {
    result[refund.status] = (result[refund.status] || 0) + 1
  }
  return result
})

const visibleRefunds = computed(() =>
  activeFilter.value === 'all'
    ? refunds.value
    : refunds.value.filter((r) => r.status === activeFilter.value)
)

// 'failed' también es accionable: Wompi pudo fallar por algo transitorio y el
// administrador debe poder reintentar sin crear una solicitud nueva.
const isActionable = (status: string) => status === 'pending' || status === 'failed'

const statusClasses = (status: string): string =>
  ({
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-gray-200 text-gray-700',
    failed: 'bg-red-100 text-red-800',
  })[status] || 'bg-gray-100 text-gray-800'

const formatCOP = (amount: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (value: string): string =>
  new Date(`${String(value).substring(0, 10)}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatDateTime = (value: string | null): string => {
  if (!value) return ''
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const fetchRefunds = async () => {
  isLoading.value = true
  try {
    const { data } = await api.get('/refunds')
    refunds.value = data.refunds
  } catch (error: any) {
    toast.error(error.response?.data?.error || t('errors.generic'))
  } finally {
    isLoading.value = false
  }
}

const approve = async (refund: RefundRequest) => {
  const confirmed = window.confirm(
    t('admin.refunds.approveConfirm', {
      amount: formatCOP(Number(refund.requested_amount)),
      guest: refund.guest_name,
    })
  )
  if (!confirmed) return

  busyId.value = refund.refund_request_id
  try {
    await api.post(`/refunds/${refund.refund_request_id}/approve`)
    toast.success(t('admin.refunds.approved'))
    await fetchRefunds()
  } catch (error: any) {
    toast.error(error.response?.data?.error || t('errors.generic'))
    // Si Wompi rechazó, el estado quedó en 'failed': recargar para reflejarlo.
    await fetchRefunds()
  } finally {
    busyId.value = null
  }
}

const openReject = (refund: RefundRequest) => {
  rejectTarget.value = refund
  rejectNotes.value = ''
}

const confirmReject = async () => {
  if (!rejectTarget.value) return

  isRejecting.value = true
  try {
    await api.post(`/refunds/${rejectTarget.value.refund_request_id}/reject`, {
      notes: rejectNotes.value.trim(),
    })
    toast.success(t('admin.refunds.rejected'))
    rejectTarget.value = null
    await fetchRefunds()
  } catch (error: any) {
    toast.error(error.response?.data?.error || t('errors.generic'))
  } finally {
    isRejecting.value = false
  }
}

onMounted(fetchRefunds)
</script>
