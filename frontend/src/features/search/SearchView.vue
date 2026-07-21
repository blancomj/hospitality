<template>
  <AppShell>
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Barra de búsqueda -->
      <div class="mb-8">
        <SearchBar @search="handleSearch" />
      </div>

      <!-- Resultados -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PropertyCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="properties.length > 0">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-serif text-primary-700">
            {{ properties.length }} {{ properties.length === 1 ? t('search.propertiesAvailable') : t('search.propertiesAvailable plural') }}
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PropertyCard 
            v-for="property in properties" 
            :key="property.id" 
            :property="property"
            @toggle-favorite="toggleFavorite"
          />
        </div>
      </div>

      <EmptyState 
        v-else
        :title="t('search.noResults')"
        :description="t('search.noResultsDescription')"
      >
        <template #icon>
          <svg class="w-16 h-16 text-cream-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </template>
      </EmptyState>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import PropertyCard from '@/components/property/PropertyCard.vue'
import PropertyCardSkeleton from '@/components/base/PropertyCardSkeleton.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import SearchBar from './SearchBar.vue'
import { Property } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const properties = ref<Property[]>([])
const isLoading = ref(true)

const fetchProperties = async (params: Record<string, any> = {}) => {
  isLoading.value = true
  try {
    const response = await api.get('/search', { params })
    properties.value = response.data.properties
  } catch (error) {
    console.error('Error fetching properties:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSearch = (params: Record<string, any>) => {
  router.push({ query: params })
  fetchProperties(params)
}

const toggleFavorite = async (propertyId: number) => {
  try {
    await api.put(`/properties/${propertyId}/favorite`)
    toast.success(t('property.addFavorite'))
  } catch (error) {
    console.error('Error toggling favorite:', error)
    toast.error(t('errors.generic'))
  }
}

onMounted(() => {
  fetchProperties(route.query as Record<string, any>)
})
</script>
