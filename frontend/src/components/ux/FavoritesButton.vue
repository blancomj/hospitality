<template>
  <button
    @click.stop="toggleFavorite"
    :class="[
      'p-2 rounded-full transition-all duration-200',
      isFavorite
        ? 'bg-red-100 text-red-600 hover:bg-red-200'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    ]"
    :title="isFavorite ? 'Eliminar de favoritos' : 'Agregar a favoritos'"
  >
    <Heart
      :class="[
        'w-5 h-5 transition-transform',
        isFavorite ? 'fill-current scale-110' : ''
      ]"
    />
  </button>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Heart } from 'lucide-vue-next'

const props = defineProps<{
  propertyId: number
}>()

const emit = defineEmits<{
  (e: 'toggle', isFavorite: boolean): void
}>()

const isFavorite = ref(false)

const getFavorites = (): number[] => {
  const stored = localStorage.getItem('favorites')
  return stored ? JSON.parse(stored) : []
}

const saveFavorites = (favorites: number[]) => {
  localStorage.setItem('favorites', JSON.stringify(favorites))
}

const toggleFavorite = () => {
  const favorites = getFavorites()
  const index = favorites.indexOf(props.propertyId)
  
  if (index > -1) {
    favorites.splice(index, 1)
    isFavorite.value = false
  } else {
    favorites.push(props.propertyId)
    isFavorite.value = true
  }
  
  saveFavorites(favorites)
  emit('toggle', isFavorite.value)
}

onMounted(() => {
  const favorites = getFavorites()
  isFavorite.value = favorites.includes(props.propertyId)
})

watch(() => props.propertyId, (newId) => {
  const favorites = getFavorites()
  isFavorite.value = favorites.includes(newId)
})
</script>
