<template>
  <div class="space-y-6">
    <!-- Stats -->
    <div v-if="stats.count > 0" class="flex items-center gap-4">
      <div class="flex items-center">
        <Star class="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <span class="ml-1 text-lg font-bold">{{ stats.average.toFixed(1) }}</span>
      </div>
      <span class="text-gray-500">·</span>
      <span class="text-gray-500">{{ stats.count }} reseñas</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 skeleton rounded-2xl" />
    </div>

    <!-- Reviews list -->
    <div v-else-if="reviews.length > 0" class="space-y-4">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div
              v-if="review.guest_avatar"
              class="w-10 h-10 rounded-full overflow-hidden"
            >
              <img
                :src="review.guest_avatar"
                :alt="review.guest_name"
                class="w-full h-full object-cover"
              />
            </div>
            <div
              v-else
              class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center"
            >
              <span class="text-primary-700 font-medium">
                {{ review.guest_name.charAt(0).toUpperCase() }}
              </span>
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ review.guest_name }}</p>
              <p class="text-sm text-gray-500">{{ formatDate(review.created_at) }}</p>
            </div>
          </div>
          <div class="flex gap-0.5">
            <Star
              v-for="star in 5"
              :key="star"
              :class="[
                'w-4 h-4',
                star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              ]"
            />
          </div>
        </div>

        <!-- Comment -->
        <p v-if="review.comment" class="text-gray-700 mb-4">{{ review.comment }}</p>

        <!-- Host reply -->
        <div
          v-if="review.host_reply"
          class="bg-gray-50 rounded-xl p-4 mt-4"
        >
          <p class="text-sm font-medium text-gray-700 mb-1">Respuesta del propietario:</p>
          <p class="text-gray-600">{{ review.host_reply }}</p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="text-center py-8"
    >
      <MessageSquare class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">Aún no hay reseñas para esta propiedad</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Star, MessageSquare } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'

const props = defineProps<{
  propertyId: number
}>()

const toast = useToast()

interface Review {
  id: number
  booking_id: number
  property_id: number
  guest_id: number
  guest_name: string
  guest_avatar: string | null
  rating: number
  comment: string | null
  host_reply: string | null
  created_at: string
}

const reviews = ref<Review[]>([])
const stats = ref({ average: 0, count: 0 })
const isLoading = ref(true)

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const fetchReviews = async () => {
  isLoading.value = true
  try {
    const response = await api.get(`/properties/${props.propertyId}/reviews`)
    reviews.value = response.data.reviews
    stats.value = response.data.stats
  } catch (error) {
    console.error('Error fetching reviews:', error)
    toast.error('Error al cargar reseñas')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchReviews()
})
</script>
