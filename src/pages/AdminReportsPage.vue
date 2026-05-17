<template>
  <AdminLayout page-title="Reports">
    <div class="space-y-6">
      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Input
          v-model="dateFrom"
          label="From"
          type="date"
        />
        <Input
          v-model="dateTo"
          label="To"
          type="date"
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
              <DropdownItem @click="downloadReport(row.id)">
                <font-awesome-icon icon="download" class="mr-2" /> Download
              </DropdownItem>
              <DropdownItem @click="deleteReport(row.id)">
                <font-awesome-icon icon="trash" class="mr-2 text-destructive" /> Delete
              </DropdownItem>
            </Dropdown>
          </template>
        </Table>

        <EmptyState v-else title="No reports found" message="Try adjusting your filters" />
      </Card>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import AdminLayout from '../components/layout/AdminLayout.vue'
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
const notificationStore = useNotificationStore()

const reports = ref([])
const searchQuery = ref('')
const statusFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')

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

  if (dateFrom.value) {
    filtered = filtered.filter((r) => new Date(r.created_at) >= new Date(dateFrom.value))
  }

  if (dateTo.value) {
    filtered = filtered.filter((r) => new Date(r.created_at) <= new Date(dateTo.value))
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
    reports.value = await reportService.getAll() || []
  } catch (error) {
    notificationStore.error('Failed to load reports')
  }
}

const viewReport = (id) => {
  router.push(`/admin/reports/${id}`)
}

const downloadReport = (id) => {
  const report = reports.value.find((r) => r.id === id)
  if (report) {
    const content = `
Case Title: ${report.case_title}
Session Type: ${report.session_type}
Status: ${report.status}
Created: ${formatDate(report.created_at)}

Transcription:
${report.transcription}
    `
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
    element.setAttribute('download', `${report.case_title}.txt`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    notificationStore.success('Report downloaded')
  }
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
