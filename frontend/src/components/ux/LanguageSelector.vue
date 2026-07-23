<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Globe class="w-4 h-4" />
      <span>{{ currentLocale === 'es' ? 'ES' : 'EN' }}</span>
      <ChevronDown class="w-3 h-3" :class="{ 'rotate-180': isOpen }" />
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          @click="selectLocale(loc.code)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-primary-50 text-primary-700': loc.code === currentLocale }"
        >
          <span class="font-medium">{{ loc.code.toUpperCase() }}</span>
          <span class="text-gray-500 text-xs">{{ loc.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Globe, ChevronDown } from 'lucide-vue-next'
import { useI18nStore } from '@/stores/i18n'

const router = useRouter()
const route = useRoute()
const i18nStore = useI18nStore()

const isOpen = ref(false)
const currentLocale = computed(() => i18nStore.locale)

const locales = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
]

const selectLocale = (newLocale: string) => {
  const oldLocale = i18nStore.locale
  i18nStore.setLocale(newLocale)

  const currentPath = route.fullPath
  const newPath = currentPath.replace(`/${oldLocale}`, `/${newLocale}`) || `/${newLocale}`
  router.push(newPath)

  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', handleClickOutside)
}
</script>
