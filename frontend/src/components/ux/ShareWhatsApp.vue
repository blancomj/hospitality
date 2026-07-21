<template>
  <button
    @click="shareOnWhatsApp"
    class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
  >
    <MessageCircle class="w-5 h-5" />
    <span>Compartir</span>
  </button>
</template>

<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  propertyId: number
}>()

const shareOnWhatsApp = () => {
  const baseUrl = window.location.origin
  const propertyUrl = `${baseUrl}/property/${props.propertyId}`
  const text = `¡Mira esta propiedad en CONSTRUESCALA!\n\n${props.title}\n\n${propertyUrl}`
  const encodedText = encodeURIComponent(text)
  window.open(`https://wa.me/?text=${encodedText}`, '_blank')
}
</script>
