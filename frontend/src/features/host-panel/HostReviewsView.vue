<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('hostPanel.reviews') }}
        </h1>
        <p class="text-gray-600">{{ t('hostPanel.reviewsSubtitle') }}</p>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-6">
        <button
          v-for="filter in filters"
          :key="String(filter.value)"
          @click="currentFilter = filter.value"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            currentFilter === filter.value
              ? 'bg-primary-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          ]"
        >
          {{ filter.label }}
          <span
            v-if="filter.value === true && unansweredCount > 0"
            class="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-accent-600 text-white"
          >
            {{ unansweredCount }}
          </span>
        </button>
      </div>

      <!-- Cargando -->
      <div v-if="isLoading" class="space-y-4">
        <div
          v-for="n in 3"
          :key="n"
          class="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse"
        >
          <div class="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div class="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div
        v-else-if="reviews.length === 0"
        class="bg-white rounded-2xl border border-gray-100 p-12 text-center"
      >
        <MessageSquare class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="font-medium text-gray-900 mb-1">
          {{ currentFilter ? t('hostPanel.reviewsAllAnswered') : t('hostPanel.reviewsEmpty') }}
        </h3>
        <p class="text-sm text-gray-500">
          {{ currentFilter ? t('hostPanel.reviewsAllAnsweredHint') : t('hostPanel.reviewsEmptyHint') }}
        </p>
      </div>

      <!-- Listado -->
      <div v-else class="space-y-4">
        <article
          v-for="review in reviews"
          :key="review.review_id"
          class="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <!-- Cabecera: huésped, propiedad, calificación -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex items-center gap-3 min-w-0">
              <img
                v-if="review.guest_avatar"
                :src="review.guest_avatar"
                :alt="review.guest_name"
                class="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium shrink-0"
              >
                {{ review.guest_name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ review.guest_name }}</p>
                <p class="text-sm text-gray-500 truncate">
                  {{ review.property_title }} · {{ formatDate(review.created_at) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Star
                v-for="n in 5"
                :key="n"
                class="w-4 h-4"
                :class="n <= review.rating ? 'text-gold fill-gold' : 'text-gray-300'"
              />
            </div>
          </div>

          <!-- Comentario -->
          <p v-if="review.comment" class="text-gray-700 mb-4">{{ review.comment }}</p>

          <!-- Respuesta ya publicada -->
          <div
            v-if="review.host_reply && editingId !== review.review_id"
            class="bg-cream rounded-xl p-4 border-l-4 border-primary-600"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-primary-700 mb-1">
                  {{ t('hostPanel.yourReply') }}
                </p>
                <p class="text-gray-600">{{ review.host_reply }}</p>
              </div>
              <button
                @click="startEditing(review)"
                class="text-sm text-primary-600 hover:text-primary-700 shrink-0"
              >
                {{ t('common.edit') }}
              </button>
            </div>
          </div>

          <!-- Formulario de respuesta -->
          <div v-else-if="editingId === review.review_id" class="space-y-3">
            <textarea
              v-model="replyText"
              rows="3"
              :placeholder="t('hostPanel.replyPlaceholder')"
              maxlength="1000"
              class="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            ></textarea>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">{{ replyText.length }} / 1000</span>
              <div class="flex gap-2">
                <button
                  @click="cancelEditing"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="submitReply(review)"
                  :disabled="!replyText.trim() || isSaving"
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isSaving ? t('common.saving') : t('hostPanel.publishReply') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Sin responder -->
          <button
            v-else
            @click="startEditing(review)"
            class="inline-flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <Reply class="w-4 h-4" />
            {{ t('hostPanel.replyToReview') }}
          </button>
        </article>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import { Star, Reply, MessageSquare } from 'lucide-vue-next'
import AppShell from '@/components/base/AppShell.vue'
import api from '@/lib/api'

interface HostReview {
  review_id: number
  property_id: number
  property_title: string
  property_city: string
  booking_id: number
  start_date: string
  end_date: string
  rating: number
  comment: string | null
  host_reply: string | null
  is_unanswered: number
  created_at: string
  updated_at: string
  guest_name: string
  guest_avatar: string | null
}

const { t } = useI18n()
const toast = useToast()

const reviews = ref<HostReview[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const currentFilter = ref(false)
const editingId = ref<number | null>(null)
const replyText = ref('')

const filters = computed(() => [
  { value: false, label: t('hostPanel.reviewsAll') },
  { value: true, label: t('hostPanel.reviewsUnanswered') },
])

// El contador solo es fiable mientras se ve el listado completo; con el filtro
// de pendientes activo, todas las visibles lo son.
const unansweredCount = computed(() =>
  currentFilter.value
    ? reviews.value.length
    : reviews.value.filter((r) => !r.host_reply).length
)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

const startEditing = (review: HostReview) => {
  editingId.value = review.review_id
  replyText.value = review.host_reply ?? ''
}

const cancelEditing = () => {
  editingId.value = null
  replyText.value = ''
}

const fetchReviews = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/host/reviews', {
      params: currentFilter.value ? { unanswered: 'true' } : {},
    })
    reviews.value = response.data.reviews
  } catch {
    toast.error(t('hostPanel.reviewsError'))
  } finally {
    isLoading.value = false
  }
}

const submitReply = async (review: HostReview) => {
  const text = replyText.value.trim()
  if (!text) return

  isSaving.value = true
  try {
    await api.post(`/reviews/${review.review_id}/reply`, { reply: text })
    // Se actualiza en memoria para no recargar toda la lista y perder la
    // posición de lectura.
    review.host_reply = text
    cancelEditing()
    toast.success(t('hostPanel.replyPublished'))
    // Con el filtro de pendientes activo, la reseña ya no pertenece al listado.
    if (currentFilter.value) {
      reviews.value = reviews.value.filter((r) => r.review_id !== review.review_id)
    }
  } catch {
    toast.error(t('hostPanel.replyError'))
  } finally {
    isSaving.value = false
  }
}

watch(currentFilter, fetchReviews)
onMounted(fetchReviews)
</script>
