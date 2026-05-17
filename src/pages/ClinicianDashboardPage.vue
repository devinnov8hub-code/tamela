<template>
  <ClinicianLayout page-title="Dashboard">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Stats Cards -->
      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">Total Reports</p>
          <p class="text-3xl font-bold">{{ stats.totalReports }}</p>
        </div>
      </Card>

      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">Processing</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats.processing }}</p>
        </div>
      </Card>

      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">Completed</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.completed }}</p>
        </div>
      </Card>

      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">This Week</p>
          <p class="text-3xl font-bold text-purple-600">{{ stats.thisWeek }}</p>
        </div>
      </Card>
    </div>

    <!-- Recent Reports -->
    <div class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Recent Reports</h2>
        <router-link to="/recording" class="text-primary hover:underline text-sm">
          Start New Recording
        </router-link>
      </div>

      <Card>
        <Table
          v-if="reports.length"
          :rows="reports"
          :columns="columns"
          :page-size="5"
          :actions="true"
        >
          <template #cell-status="{ row }">
            <span
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusColor(row.status),
              ]"
            >
              {{ row.status }}
            </span>
          </template>

          <template #cell-created_at="{ row }">
            {{ formatDate(row.created_at) }}
          </template>

          <template #actions="{ row }">
            <Dropdown>
              <DropdownItem @click="viewReport(row.id)">
                <font-awesome-icon icon="eye" class="mr-2" /> View
              </DropdownItem>
              <DropdownItem @click="editReport(row.id)">
                <font-awesome-icon icon="pencil" class="mr-2" /> Edit
              </DropdownItem>
              <DropdownItem @click="deleteReport(row.id)">
                <font-awesome-icon icon="trash" class="mr-2 text-destructive" /> Delete
              </DropdownItem>
            </Dropdown>
          </template>
        </Table>

        <EmptyState v-else title="No reports yet" message="Start by creating your first recording" />
      </Card>
    </div>
  </ClinicianLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notification'
import ClinicianLayout from '../components/layout/ClinicianLayout.vue'
import Card from '../components/ui/Card.vue'
import Table from '../components/ui/Table.vue'
import Dropdown from '../components/ui/Dropdown.vue'
import DropdownItem from '../components/ui/DropdownItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { reportService } from '../services/reports'
import { formatDate } from '../utils/helpers'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const reports = ref([])
const loading = ref(false)

const columns = [
  { key: 'case_title', label: 'Case Title' },
  { key: 'session_type', label: 'Session Type' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]

const stats = computed(() => {
  const completed = reports.value.filter((r) => r.status === 'completed').length
  const processing = reports.value.filter((r) => r.status === 'processing').length
  const thisWeek = reports.value.filter((r) => {
    const date = new Date(r.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return date >= weekAgo
  }).length

  return {
    totalReports: reports.value.length,
    completed,
    processing,
    thisWeek,
  }
})

const statusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  }
  return colors[status] || colors.pending
}

const loadReports = async () => {
  loading.value = true
  try {
    if (authStore.user) {
      reports.value = await reportService.getByClinicianId(authStore.user.id) || []
    }
  } catch (error) {
    notificationStore.error('Failed to load reports')
  } finally {
    loading.value = false
  }
}

const viewReport = (id) => {
  router.push(`/reports/${id}`)
}

const editReport = (id) => {
  router.push(`/reports/${id}/edit`)
}

const deleteReport = async (id) => {
  if (confirm('Are you sure you want to delete this report?')) {
    try {
      await reportService.delete(id)
      notificationStore.success('Report deleted')
      loadReports()
    } catch (error) {
      notificationStore.error('Failed to delete report')
    }
  }
}

onMounted(() => {
  loadReports()
})
</script>
