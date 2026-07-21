<template>
  <div class="card overflow-hidden">
    <!-- Imagen skeleton -->
    <div class="aspect-[4/3] skeleton" />
    
    <!-- Contenido skeleton -->
    <div class="p-4 space-y-3">
      <!-- Título -->
      <div class="h-5 skeleton w-3/4" />
      
      <!-- Subtítulo -->
      <div class="h-4 skeleton w-1/2" />
      
      <!-- Precio -->
      <div class="flex items-center justify-between">
        <div class="h-6 skeleton w-1/3" />
        <div class="h-4 skeleton w-1/4" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Skeleton component for property cards
</script>
