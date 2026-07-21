<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <h3 class="text-lg font-medium text-gray-900 mb-4">Dejar una reseña</h3>

    <!-- Rating -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Calificación</label>
      <div class="flex gap-1">
        <button
          v-for="star in 5"
          :key="star"
          @click="rating = star"
          class="p-1 transition-colors"
        >
          <Star
            :class="[
              'w-8 h-8 transition-colors',
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            ]"
          />
        </button>
      </div>
    </div>

    <!-- Comment -->
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Comentario (opcional)</label>
      <textarea
        v-model="comment"
        rows="4"
        maxlength="1000"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
        placeholder="Cuéntanos sobre tu experiencia..."
      />
    </div>

    <!-- Submit -->
    <button
      @click="submitReview"
      :disabled="rating === 0 || isSubmitting"
      class="w-full bg-primary-600 text-white py-3 px-6 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
    >
      {{ isSubmitting ? 'Enviando...' : 'Enviar reseña' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Star } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'

const props = defineProps<{
  bookingId: number
}>()

const emit = defineEmits<{
  (e: 'reviewed'): void
}>()

const toast = useToast()

const rating = ref(0)
const comment = ref('')
const isSubmitting = ref(false)

const submitReview = async () => {
  if (rating.value === 0) {
    toast.warning('Selecciona una calificación')
    return
  }

  isSubmitting.value = true
  try {
    await api.post(`/bookings/${props.bookingId}/review`, {
      bookingId: props.bookingId,
      rating: rating.value,
      comment: comment.value || undefined,
    })
    toast.success('Reseña enviada exitosamente')
    emit('reviewed')
  } catch (error: any) {
    const message = error.response?.data?.error || 'Error al enviar reseña'
    toast.error(message)
  } finally {
    isSubmitting.value = false
  }
}
</script>
