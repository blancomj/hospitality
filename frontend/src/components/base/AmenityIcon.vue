<template>
  <component :is="icono" :class="clase" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Wifi, Tv, AirVent, Fan, Thermometer, DoorOpen,
  ChefHat, Refrigerator, Flame, CookingPot, Microwave, Coffee, CupSoda, Utensils,
  WashingMachine, Shirt, Zap, Sparkles,
  Fence, Sun, Trees, Waves, Building2, Mountain,
  Dumbbell, Laptop, ArrowUp, Car, Shield,
  Baby, Smile,
  FireExtinguisher, BriefcaseMedical, AlertTriangle, Lock, Cctv,
  Accessibility, PawPrint, Cigarette, PartyPopper,
  Circle,
} from 'lucide-vue-next'

/**
 * Resuelve el icono de una amenidad a partir del nombre guardado en la base de
 * datos (kebab-case, por ejemplo 'washing-machine').
 *
 * IMPORTANTE: los iconos se importan uno a uno a propósito. Usar
 * `import * as lucide from 'lucide-vue-next'` desactiva el tree-shaking y mete
 * la librería entera en el bundle: en una prueba, esta vista pasó de 19 kB a
 * 816 kB. Si añades una amenidad con un icono nuevo, agrégalo también a este
 * mapa; si no, se mostrará el icono genérico en lugar de romperse.
 */
const MAPA: Record<string, any> = {
  'wifi': Wifi, 'tv': Tv, 'air-vent': AirVent, 'fan': Fan,
  'thermometer': Thermometer, 'door-open': DoorOpen,
  'chef-hat': ChefHat, 'refrigerator': Refrigerator, 'flame': Flame,
  'cooking-pot': CookingPot, 'microwave': Microwave, 'coffee': Coffee,
  'cup-soda': CupSoda, 'utensils': Utensils,
  'washing-machine': WashingMachine, 'shirt': Shirt, 'zap': Zap, 'sparkles': Sparkles,
  'fence': Fence, 'sun': Sun, 'trees': Trees, 'waves': Waves,
  'building-2': Building2, 'building': Building2, 'mountain': Mountain,
  'dumbbell': Dumbbell, 'laptop': Laptop, 'arrow-up': ArrowUp,
  'car': Car, 'shield': Shield,
  'baby': Baby, 'smile': Smile,
  'fire-extinguisher': FireExtinguisher, 'briefcase-medical': BriefcaseMedical,
  'first-aid': BriefcaseMedical, 'alert-triangle': AlertTriangle,
  'lock': Lock, 'cctv': Cctv, 'camera': Cctv,
  'accessibility': Accessibility,
  'paw-print': PawPrint, 'cigarette': Cigarette, 'party-popper': PartyPopper,
}

const props = withDefaults(
  defineProps<{ name?: string | null; clase?: string }>(),
  { name: '', clase: 'w-4 h-4' }
)

const icono = computed(() => MAPA[(props.name || '').toLowerCase()] || Circle)
</script>
