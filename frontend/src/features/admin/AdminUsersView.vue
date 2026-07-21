<template>
  <AppShell>
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-serif text-primary-700 mb-2">
          {{ t('admin.usersTitle') }}
        </h1>
        <p class="text-gray-600">{{ t('admin.usersSubtitle') }}</p>
      </div>

      <!-- Search -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div class="flex flex-wrap gap-4 items-end">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('common.search') }}</label>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('admin.searchPlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.filterStatus') }}</label>
            <select
              v-model="statusFilter"
              class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{{ t('admin.filterAll') }}</option>
              <option value="active">{{ t('admin.filterActive') }}</option>
              <option value="suspended">{{ t('admin.filterSuspended') }}</option>
            </select>
          </div>
          <button
            @click="fetchUsers"
            class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {{ t('common.search') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-4">
        <div v-for="i in 4" :key="i" class="h-20 skeleton rounded-2xl" />
      </div>

      <!-- Users list -->
      <div v-else-if="users.length > 0" class="space-y-4">
        <div
          v-for="user in users"
          :key="user.id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div
                v-if="user.avatar_url"
                class="w-12 h-12 rounded-full overflow-hidden"
              >
                <img :src="user.avatar_url" class="w-full h-full object-cover" />
              </div>
              <div
                v-else
                class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center"
              >
                <span class="text-primary-700 font-medium text-lg">
                  {{ user.full_name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ user.full_name }}</h3>
                <p class="text-sm text-gray-500">{{ user.email }}</p>
                <p class="text-xs text-gray-400">
                  {{ user.role === 'host' ? t('roles.host') : user.role === 'admin' ? t('roles.admin') : t('roles.guest') }}
                  · {{ formatDate(user.created_at) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium',
                  user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                ]"
              >
                {{ user.status === 'active' ? t('admin.statusActive') : t('admin.statusSuspended') }}
              </span>
              <button
                @click="toggleUserStatus(user)"
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  user.status === 'active'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                ]"
              >
                {{ user.status === 'active' ? t('admin.actionSuspend') : t('admin.actionReactivate') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        :title="t('admin.noResults')"
        :description="t('admin.noResultsDescription')"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'vue-toastification'
import api from '@/lib/api'
import AppShell from '@/components/base/AppShell.vue'
import EmptyState from '@/components/base/EmptyState.vue'

const { t } = useI18n()
const toast = useToast()

interface User {
  id: number
  full_name: string
  email: string
  role: string
  status: string
  avatar_url: string | null
  created_at: string
}

const users = ref<User[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO')
}

const fetchUsers = async () => {
  isLoading.value = true
  try {
    const params: any = {}
    if (searchQuery.value) params.q = searchQuery.value
    if (statusFilter.value) params.status = statusFilter.value
    const response = await api.get('/admin/users', { params })
    users.value = response.data.users
  } catch (error) {
    console.error('Error fetching users:', error)
    toast.error(t('toast.usersLoadError'))
  } finally {
    isLoading.value = false
  }
}

const toggleUserStatus = async (user: User) => {
  const newStatus = user.status === 'active' ? 'suspended' : 'active'
  try {
    await api.patch(`/admin/users/${user.id}/status`, {
      status: newStatus,
      reason: `Status changed by admin`
    })
    user.status = newStatus
    toast.success(t('toast.userUpdated', { status: newStatus === 'active' ? t('admin.actionReactivate').toLowerCase() : t('admin.actionSuspend').toLowerCase() }))
  } catch (error) {
    console.error('Error updating user status:', error)
    toast.error(t('toast.userUpdateError'))
  }
}

onMounted(() => {
  fetchUsers()
})
</script>
