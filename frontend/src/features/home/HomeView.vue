<template>
  <AppShell>
    <!-- Hero Section -->
    <section class="relative bg-primary-800 text-white overflow-hidden">
      <div class="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1920&h=1080&fit=crop&q=80"
          :alt="t('home.hero.title')"
          class="w-full h-full object-cover"
          loading="eager"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-primary-900/80 via-primary-800/70 to-primary-700/90" />
      </div>
      <div class="relative max-w-7xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold mb-4 drop-shadow-lg">
          {{ t('home.hero.title') }}
        </h1>
        <p class="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto drop-shadow">
          {{ t('home.hero.subtitle') }}
        </p>
        <div class="max-w-4xl mx-auto">
          <SearchBar @search="handleSearch" />
        </div>
      </div>
    </section>

    <!-- Featured Properties -->
    <section class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl sm:text-3xl font-serif text-primary-700">
          {{ t('home.featuredTitle') }}
        </h2>
        <router-link
          :to="`/${locale}/search`"
          class="text-accent-700 hover:text-accent-800 font-medium transition-colors"
        >
          {{ t('common.viewAll') }} &rarr;
        </router-link>
      </div>

      <div v-if="isLoadingProperties" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PropertyCardSkeleton v-for="i in 6" :key="i" />
      </div>

      <div v-else-if="featuredProperties.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PropertyCard
          v-for="property in featuredProperties"
          :key="property.id"
          :property="property"
          @toggle-favorite="toggleFavorite"
        />
      </div>

      <div v-else class="text-center py-12 text-gray-500">
        {{ t('common.noResults') }}
      </div>
    </section>

    <!-- Value Propositions -->
    <section class="bg-cream-50 py-12 sm:py-16">
      <div class="max-w-7xl mx-auto px-4">
        <h2 class="text-2xl sm:text-3xl font-serif text-primary-700 text-center mb-12">
          {{ t('home.whyTitle') }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div
            v-for="(feature, index) in features"
            :key="index"
            class="text-center"
          >
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <component :is="feature.icon" class="w-8 h-8 text-primary-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ feature.title }}
            </h3>
            <p class="text-gray-600 text-sm leading-relaxed">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Cities -->
    <section class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
      <h2 class="text-2xl sm:text-3xl font-serif text-primary-700 text-center mb-10">
        {{ t('home.citiesTitle') }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <router-link
          v-for="city in cities"
          :key="city.name"
          :to="`/${locale}/search?city=${city.name}`"
          class="group relative h-64 rounded-2xl overflow-hidden"
        >
          <img
            :src="city.image"
            :alt="city.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div class="absolute bottom-6 left-6 text-white">
            <h3 class="text-2xl font-serif font-bold">{{ city.name }}</h3>
            <p class="text-sm text-white/80">{{ city.count }} {{ t('home.properties').toLowerCase() }}</p>
          </div>
        </router-link>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-primary-700 text-white py-16">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-3xl sm:text-4xl font-serif font-bold mb-4">
          {{ t('home.ctaTitle') }}
        </h2>
        <p class="text-primary-100 text-lg mb-8">
          {{ t('home.ctaSubtitle') }}
        </p>
        <router-link
          :to="`/${locale}/search`"
          class="inline-block px-8 py-4 bg-accent-700 hover:bg-accent-800 text-white font-semibold rounded-xl transition-colors"
        >
          {{ t('home.ctaButton') }}
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-10">
      <div class="max-w-7xl mx-auto px-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 class="text-white font-semibold mb-3">{{ t('common.appName') }}</h4>
            <p class="text-sm leading-relaxed">{{ t('home.footerTagline') }}</p>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-3">{{ t('home.footerLinks') }}</h4>
            <ul class="space-y-2 text-sm">
              <li>
                <router-link :to="`/${locale}/search`" class="hover:text-white transition-colors">
                  {{ t('nav.search') }}
                </router-link>
              </li>
              <li>
                <router-link :to="`/${locale}/favorites`" class="hover:text-white transition-colors">
                  {{ t('nav.favorites') }}
                </router-link>
              </li>
              <li>
                <router-link :to="`/${locale}/bookings`" class="hover:text-white transition-colors">
                  {{ t('nav.myBookings') }}
                </router-link>
              </li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-3">{{ t('home.footerContact') }}</h4>
            <ul class="space-y-2 text-sm">
              <li>Medellin &middot; Cartagena</li>
              <li>hola@construescala.com</li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 pt-6 text-center text-sm">
          &copy; {{ new Date().getFullYear() }} {{ t('common.appName') }}. {{ t('home.allRights') }}
        </div>
      </div>
    </footer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, h, onMounted, type FunctionalComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import PropertyCard from '@/components/property/PropertyCard.vue'
import PropertyCardSkeleton from '@/components/base/PropertyCardSkeleton.vue'
import SearchBar from '@/features/search/SearchBar.vue'
import { Property } from '@/types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const locale = (route.params.locale as string) || 'es'

const featuredProperties = ref<Property[]>([])
const isLoadingProperties = ref(true)

const cities = [
  {
    name: 'Medellin',
    count: 0,
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=500&fit=crop&q=80',
  },
  {
    name: 'Cartagena',
    count: 0,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=500&fit=crop&q=80',
  },
]

const IconHome: FunctionalComponent = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-8 h-8' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.5',
      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
    }),
  ])

const IconMap: FunctionalComponent = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-8 h-8' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.5',
      d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    }),
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.5',
      d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    }),
  ])

const IconCurrency: FunctionalComponent = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-8 h-8' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.5',
      d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    }),
  ])

const IconHeart: FunctionalComponent = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-8 h-8' }, [
    h('path', {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.5',
      d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    }),
  ])

const features = [
  {
    icon: IconHome,
    title: t('home.feature1Title'),
    description: t('home.feature1Desc'),
  },
  {
    icon: IconMap,
    title: t('home.feature2Title'),
    description: t('home.feature2Desc'),
  },
  {
    icon: IconCurrency,
    title: t('home.feature3Title'),
    description: t('home.feature3Desc'),
  },
  {
    icon: IconHeart,
    title: t('home.feature4Title'),
    description: t('home.feature4Desc'),
  },
]

const fetchFeatured = async () => {
  isLoadingProperties.value = true
  try {
    const response = await api.get('/search', { params: { limit: 6 } })
    featuredProperties.value = response.data.properties || []
  } catch (error) {
    console.warn('Error fetching featured properties — DB may be unavailable')
    featuredProperties.value = []
  } finally {
    isLoadingProperties.value = false
  }
}

const fetchCityCounts = async () => {
  try {
    const response = await api.get('/cities')
    const cityData = response.data.cities || []
    cities.forEach((city) => {
      const match = cityData.find((c: any) => c.city === city.name)
      if (match) city.count = match.property_count
    })
  } catch (error) {
    console.error('Error loading city counts:', error)
  }
}

const handleSearch = (params: Record<string, any>) => {
  router.push({ path: `/${locale}/search`, query: params })
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
  fetchFeatured()
  fetchCityCounts()
})
</script>
