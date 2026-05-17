<template>
  <AdminLayout page-title="Departments">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex-1 mr-4">
          <Input
            v-model="searchQuery"
            placeholder="Search departments..."
            type="text"
          />
        </div>
        <Button @click="openAddModal">
          <font-awesome-icon icon="plus" class="mr-2" />
          Add Department
        </Button>
      </div>

      <!-- Table -->
      <Card>
        <Table
          v-if="filteredDepartments.length"
          :rows="filteredDepartments"
          :columns="columns"
          :page-size="10"
          :actions="true"
        >
          <template #actions="{ row }">
            <Dropdown>
              <DropdownItem @click="editDepartment(row.id)">
                <font-awesome-icon icon="pencil" class="mr-2" /> Edit
              </DropdownItem>
              <DropdownItem @click="deleteDepartment(row.id)">
                <font-awesome-icon icon="trash" class="mr-2 text-destructive" /> Delete
              </DropdownItem>
            </Dropdown>
          </template>
        </Table>

        <EmptyState v-else title="No departments" message="Add your first department" />
      </Card>
    </div>

    <!-- Modal -->
    <Modal :is-open="isModalOpen" title="Department" @close="closeModal">
      <form class="space-y-4" @submit.prevent="saveDepartment">
        <Input
          v-model="form.name"
          label="Department Name"
          placeholder="Cardiology"
          required
        />
        <Input
          v-model="form.code"
          label="Department Code"
          placeholder="CARD"
          required
        />
        <Textarea
          v-model="form.description"
          label="Description"
          placeholder="Department description..."
          :rows="3"
        />

        <template #footer>
          <Button variant="outline" @click="closeModal">Cancel</Button>
          <Button type="submit" :loading="loading">
            {{ editingId ? 'Update' : 'Add' }}
          </Button>
        </template>
      </form>
    </Modal>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '../stores/notification'
import AdminLayout from '../components/layout/AdminLayout.vue'
import Card from '../components/ui/Card.vue'
import Table from '../components/ui/Table.vue'
import Modal from '../components/ui/Modal.vue'
import Input from '../components/ui/Input.vue'
import Textarea from '../components/ui/Textarea.vue'
import Button from '../components/ui/Button.vue'
import Dropdown from '../components/ui/Dropdown.vue'
import DropdownItem from '../components/ui/DropdownItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { departmentService } from '../services/departments'

const notificationStore = useNotificationStore()

const departments = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const editingId = ref(null)
const loading = ref(false)

const form = ref({
  name: '',
  code: '',
  description: '',
})

const columns = [
  { key: 'name', label: 'Department Name' },
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
]

const filteredDepartments = computed(() => {
  if (!searchQuery.value) return departments.value
  return departments.value.filter((d) =>
    `${d.name} ${d.code} ${d.description}`
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  )
})

const loadData = async () => {
  try {
    departments.value = await departmentService.getAll() || []
  } catch (error) {
    notificationStore.error('Failed to load departments')
  }
}

const openAddModal = () => {
  editingId.value = null
  form.value = { name: '', code: '', description: '' }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const saveDepartment = async () => {
  loading.value = true
  try {
    if (editingId.value) {
      await departmentService.update(editingId.value, form.value)
      notificationStore.success('Department updated')
    } else {
      await departmentService.create(form.value)
      notificationStore.success('Department added')
    }
    closeModal()
    loadData()
  } catch (error) {
    notificationStore.error('Failed to save department')
  } finally {
    loading.value = false
  }
}

const editDepartment = async (id) => {
  try {
    const department = await departmentService.getById(id)
    form.value = { ...department }
    editingId.value = id
    isModalOpen.value = true
  } catch (error) {
    notificationStore.error('Failed to load department')
  }
}

const deleteDepartment = async (id) => {
  if (confirm('Delete this department?')) {
    try {
      await departmentService.delete(id)
      notificationStore.success('Department deleted')
      loadData()
    } catch (error) {
      notificationStore.error('Failed to delete department')
    }
  }
}

onMounted(() => {
  loadData()
})
</script>
