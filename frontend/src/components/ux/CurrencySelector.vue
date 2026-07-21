<template>
  <div class="relative">
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Banknote class="w-4 h-4" />
      <span>{{ currentCurrency }}</span>
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
          v-for="currency in supportedCurrencies"
          :key="currency.code"
          @click="selectCurrency(currency.code)"
          class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-primary-50 text-primary-700': currency.code === currentCurrency }"
        >
          <span class="font-medium">{{ currency.code }}</span>
          <span class="text-gray-500 text-xs">{{ currency.name }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Banknote, ChevronDown } from 'lucide-vue-next'
import { useCurrency } from '@/composables/useCurrency'

const { currentCurrency, supportedCurrencies, setCurrency } = useCurrency()

const isOpen = ref(false)

const selectCurrency = (currency: string) => {
  setCurrency(currency)
  isOpen.value = false
}

// Close on click outside
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
