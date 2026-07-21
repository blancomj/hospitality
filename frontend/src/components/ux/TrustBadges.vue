<template>
  <div class="flex flex-wrap gap-2">
    <!-- ID Verified -->
    <div
      v-if="idVerified"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
    >
      <ShieldCheck class="w-4 h-4" />
      <span>Identidad verificada</span>
    </div>

    <!-- Fast Response -->
    <div
      v-if="fastResponse"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
    >
      <Zap class="w-4 h-4" />
      <span>Respuesta rápida</span>
    </div>

    <!-- Flexible Cancellation -->
    <div
      v-if="flexibleCancellation"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium"
    >
      <RotateCcw class="w-4 h-4" />
      <span>Cancelación flexible</span>
    </div>

    <!-- Superhost (placeholder) -->
    <div
      v-if="isSuperhost"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm font-medium"
    >
      <Award class="w-4 h-4" />
      <span>Superanfitrión</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldCheck, Zap, RotateCcw, Award } from 'lucide-vue-next'

defineProps<{
  idVerified?: boolean
  fastResponse?: boolean
  flexibleCancellation?: boolean
  isSuperhost?: boolean
}>()
</script>
