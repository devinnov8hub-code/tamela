<template>
  <ClinicianLayout page-title="Reports">
    <div class="space-y-6">
      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          v-model="searchQuery"
          placeholder="Search reports..."
          type="text"
        />
        <Select
          v-model="statusFilter"
          label="Status"
          :options="[
            { label: 'All', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Processing', value: 'processing' },
            { label: 'Completed', value: 'completed' },
            { label: 'Failed', value: 'failed' },
          ]"
        />
      </div>

      <!-- Table -->
      <Card>
        <Table
          v-if="filteredReports.length"
          :rows="filteredReports"
          :columns="columns"
          :page-size="10"
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

        <EmptyState v-else title="No reports" message="Start by creating your first recording" />
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
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Dropdown from '../components/ui/Dropdown.vue'
import DropdownItem from '../components/ui/DropdownItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { reportService } from '../services/reports'
import { formatDate } from '../utils/helpers'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const reports = ref([])
const searchQuery = ref('')
const statusFilter = ref('')

const columns = [
  { key: 'case_title', label: 'Case Title' },
  { key: 'session_type', label: 'Session Type' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]

const filteredReports = computed(() => {
  let filtered = reports.value

  if (searchQuery.value) {
    filtered = filtered.filter((r) =>
      `${r.case_title} ${r.session_type}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter((r) => r.status === statusFilter.value)
  }

  return filtered
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
  try {
    if (authStore.user) {
      reports.value = await reportService.getByClinicianId(authStore.user.id) || []
    }
  } catch (error) {
    notificationStore.error('Failed to load reports')
  }
}

const viewReport = (id) => {
  router.push(`/reports/${id}`)
}

const editReport = (id) => {
  router.push(`/reports/${id}/edit`)
}

const deleteReport = async (id) => {
  if (confirm('Delete this report?')) {
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
