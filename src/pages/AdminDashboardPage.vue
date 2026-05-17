<template>
  <AdminLayout page-title="Dashboard">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <!-- Stats Cards -->
      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">Total Clinicians</p>
          <p class="text-3xl font-bold">{{ stats.totalClinicians }}</p>
        </div>
      </Card>

      <Card>
        <div>
          <p class="text-sm text-muted-foreground mb-2">Active Clinicians</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.activeClinicians }}</p>
        </div>
      </Card>

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
    </div>

    <!-- Quick Actions -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <router-link
        to="/admin/clinicians"
        class="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <font-awesome-icon icon="users" class="text-2xl text-primary mb-2" />
        <h3 class="font-semibold">Manage Clinicians</h3>
      </router-link>

      <router-link
        to="/admin/reports"
        class="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <font-awesome-icon icon="file-lines" class="text-2xl text-primary mb-2" />
        <h3 class="font-semibold">View Reports</h3>
      </router-link>

      <router-link
        to="/admin/departments"
        class="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <font-awesome-icon icon="building" class="text-2xl text-primary mb-2" />
        <h3 class="font-semibold">Departments</h3>
      </router-link>

      <router-link
        to="/admin/specialties"
        class="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <font-awesome-icon icon="briefcase" class="text-2xl text-primary mb-2" />
        <h3 class="font-semibold">Specialties</h3>
      </router-link>
    </div>

    <!-- Recent Reports -->
    <div class="mt-8">
      <h2 class="text-xl font-bold mb-4">Recent Reports</h2>
      <Card>
        <Table
          v-if="recentReports.length"
          :rows="recentReports"
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
              <DropdownItem @click="deleteReport(row.id)">
                <font-awesome-icon icon="trash" class="mr-2 text-destructive" /> Delete
              </DropdownItem>
            </Dropdown>
          </template>
        </Table>

        <EmptyState v-else title="No reports" message="Check back later for report activity" />
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
import Dropdown from '../components/ui/Dropdown.vue'
import DropdownItem from '../components/ui/DropdownItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { clinicianService } from '../services/clinicians'
import { reportService } from '../services/reports'
import { formatDate } from '../utils/helpers'

const router = useRouter()
const notificationStore = useNotificationStore()

const clinicians = ref([])
const reports = ref([])
const loading = ref(false)

const columns = [
  { key: 'case_title', label: 'Case Title' },
  { key: 'session_type', label: 'Session Type' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]

const recentReports = computed(() => reports.value.slice(0, 5))

const stats = computed(() => {
  const activeClinicians = clinicians.value.filter((c) => c.status === 'active').length
  const completed = reports.value.filter((r) => r.status === 'completed').length
  const processing = reports.value.filter((r) => r.status === 'processing').length

  return {
    totalClinicians: clinicians.value.length,
    activeClinicians,
    totalReports: reports.value.length,
    completed,
    processing,
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

const loadData = async () => {
  loading.value = true
  try {
    const [cliniciansData, reportsData] = await Promise.all([
      clinicianService.getAll(),
      reportService.getAll(),
    ])
    clinicians.value = cliniciansData || []
    reports.value = reportsData || []
  } catch (error) {
    notificationStore.error('Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

const viewReport = (id) => {
  router.push(`/admin/reports/${id}`)
}

const deleteReport = async (id) => {
  if (confirm('Are you sure you want to delete this report?')) {
    try {
      await reportService.delete(id)
      notificationStore.success('Report deleted')
      loadData()
    } catch (error) {
      notificationStore.error('Failed to delete report')
    }
  }
}

onMounted(() => {
  loadData()
})
</script>
