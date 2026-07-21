<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          Reservas de la propiedad
        </h1>
        <p class="text-gray-600" v-if="property">
          {{ property.title }} - {{ property.city }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="i in 4" :key="i" class="h-48 skeleton rounded-2xl" />
      </div>

      <!-- Bookings list -->
      <div v-else-if="bookings.length > 0" class="space-y-4">
        <BookingCard
          v-for="booking in bookings"
          :key="booking.booking_id"
          :booking="booking"
          :show-guest="true"
        />
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="No hay reservas"
        description="Aún no se han recibido reservas para esta propiedad."
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'
import BookingCard from './BookingCard.vue'
import { Booking, Property } from '@/types'

const route = useRoute()
const toast = useToast()

const bookings = ref<Booking[]>([])
const property = ref<Property | null>(null)
const isLoading = ref(true)

const fetchBookings = async () => {
  isLoading.value = true
  try {
    const propertyId = route.params.propertyId as string
    
    // Fetch property details
    const propResponse = await api.get(`/properties/${propertyId}`)
    property.value = propResponse.data.property

    // Fetch bookings
    const bookingsResponse = await api.get(`/bookings/property/${propertyId}`)
    bookings.value = bookingsResponse.data.bookings
  } catch (error) {
    console.error('Error fetching bookings:', error)
    toast.error('Error al cargar reservas')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBookings()
})
</script>
