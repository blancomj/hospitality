<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Icono -->
    <div class="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mb-4">
      <slot name="icon">
        <svg 
          class="w-8 h-8 text-cream-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="1.5" 
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </slot>
    </div>
    
    <!-- Título -->
    <h3 class="text-lg font-semibold text-gray-900 mb-2">
      {{ title }}
    </h3>
    
    <!-- Descripción -->
    <p class="text-gray-500 mb-6 max-w-sm">
      {{ description }}
    </p>
    
    <!-- Acción -->
    <slot name="action" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  description: '',
})
</script>
