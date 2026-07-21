<template>
  <AppShell>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          Aprobar propietarios
        </h1>
        <p class="text-gray-600">
          Revisar y aprobar solicitudes de propietarios
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="h-32 skeleton rounded-2xl" />
      </div>

      <!-- Pending hosts -->
      <div v-else-if="pendingHosts.length > 0" class="space-y-4">
        <div
          v-for="host in pendingHosts"
          :key="host.user_id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-medium text-gray-900">{{ host.full_name }}</h3>
              <p class="text-gray-500 text-sm">{{ host.email }}</p>
              
              <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div v-if="host.legal_name">
                  <span class="text-gray-500">Razón social:</span>
                  <p class="font-medium">{{ host.legal_name }}</p>
                </div>
                <div v-if="host.document_id">
                  <span class="text-gray-500">Documento:</span>
                  <p class="font-medium">{{ host.document_id }}</p>
                </div>
                <div v-if="host.bank_name">
                  <span class="text-gray-500">Banco:</span>
                  <p class="font-medium">{{ host.bank_name }}</p>
                </div>
                <div>
                  <span class="text-gray-500">Solicitud:</span>
                  <p class="font-medium">{{ formatDate(host.created_at) }}</p>
                </div>
              </div>
            </div>

            <div class="flex gap-2 ml-4">
              <button
                @click="approveHost(host.user_id)"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Aprobar
              </button>
              <button
                @click="rejectHost(host.user_id)"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="Sin solicitudes pendientes"
        description="No hay propietarios pendientes de aprobación."
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const toast = useToast()

interface PendingHost {
  user_id: number
  full_name: string
  email: string
  legal_name: string | null
  document_id: string | null
  bank_name: string | null
  created_at: string
}

const pendingHosts = ref<PendingHost[]>([])
const isLoading = ref(true)

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const fetchPendingHosts = async () => {
  isLoading.value = true
  try {
    const response = await api.get('/host-approvals/pending')
    pendingHosts.value = response.data.hosts
  } catch (error) {
    console.error('Error fetching pending hosts:', error)
    toast.error('Error al cargar propietarios pendientes')
  } finally {
    isLoading.value = false
  }
}

const approveHost = async (userId: number) => {
  try {
    await api.post('/host-approvals', { userId, action: 'approve' })
    toast.success('Propietario aprobado exitosamente')
    pendingHosts.value = pendingHosts.value.filter(h => h.user_id !== userId)
  } catch (error) {
    console.error('Error approving host:', error)
    toast.error('Error al aprobar propietario')
  }
}

const rejectHost = async (userId: number) => {
  try {
    await api.post('/host-approvals', { userId, action: 'reject' })
    toast.success('Propietario rechazado')
    pendingHosts.value = pendingHosts.value.filter(h => h.user_id !== userId)
  } catch (error) {
    console.error('Error rejecting host:', error)
    toast.error('Error al rechazar propietario')
  }
}

onMounted(() => {
  fetchPendingHosts()
})
</script>
