<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('favorites.title') }}
        </h1>
        <p class="text-gray-600">
          {{ properties.length }} {{ properties.length === 1 ? t('favorites.savedCount') : t('favorites.savedCountPlural') }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 6" :key="i" class="h-72 skeleton rounded-2xl" />
      </div>

      <!-- Properties grid -->
      <div v-else-if="properties.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PropertyCard
          v-for="property in properties"
          :key="property.id"
          :property="property"
          :is-favorite="true"
          @toggle-favorite="handleRemoveFavorite"
        />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        :title="t('favorites.empty')"
        :description="t('favorites.emptyDescription')"
      >
        <router-link
          :to="`/${locale}/search`"
          class="mt-4 inline-block px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          {{ t('favorites.explore') }}
        </router-link>
      </EmptyState>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import PropertyCard from '@/components/property/PropertyCard.vue'
import { Property } from '@/types'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const locale = (route.params.locale as string) || 'es'
const properties = ref<Property[]>([])
const isLoading = ref(true)

const fetchFavorites = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/users/me/favorites')
    const favoriteIds: number[] = response.data.favorites

    if (favoriteIds.length === 0) {
      properties.value = []
      return
    }

    const propertyPromises = favoriteIds.map(id =>
      api.get(`/properties/${id}`).then(res => res.data.property)
    )
    properties.value = await Promise.all(propertyPromises)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    toast.error(t('errors.generic'))
  } finally {
    isLoading.value = false
  }
}

const handleRemoveFavorite = async (propertyId: number) => {
  try {
    await api.delete(`/properties/${propertyId}/favorite`)
    properties.value = properties.value.filter(p => p.id !== propertyId)
    toast.success(t('property.removeFavorite'))
  } catch (error) {
    console.error('Error removing favorite:', error)
    toast.error(t('errors.generic'))
  }
}

onMounted(() => {
  fetchFavorites()
})
</script>
