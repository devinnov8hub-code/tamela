<template>
  <AdminLayout page-title="Manage Clinicians">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex-1 mr-4">
          <Input
            v-model="searchQuery"
            placeholder="Search clinicians..."
            type="text"
          />
        </div>
        <Button @click="openAddModal">
          <font-awesome-icon icon="plus" class="mr-2" />
          Add Clinician
        </Button>
      </div>

      <!-- Table (temporarily simplified while debugging) -->
      <Card>
        <div class="p-6 text-center">Clinician table placeholder</div>
      </Card>
    </div>

    <!-- Add/Edit Modal -->
    <Modal :is-open="isModalOpen" title="Add Clinician" @close="closeModal">
      <form class="space-y-4" @submit.prevent="saveClinician">
        <Input
          v-model="form.firstName"
          label="First Name"
          placeholder="John"
          required
        />
        <Input
          v-model="form.lastName"
          label="Last Name"
          placeholder="Doe"
          required
        />
        <Input
          v-model="form.email"
          type="email"
          label="Email"
          placeholder="john@example.com"
          required
        />
        <Input
          v-model="form.title"
          label="Title"
          placeholder="Dr., RN, etc."
          required
        />
        <Select
          v-model="form.specialty"
          label="Specialty"
          :options="specialtyOptions"
          required
        />
        <Select
          v-model="form.department"
          label="Department"
          :options="departmentOptions"
          required
        />
        <Input
          v-if="!editingId"
          v-model="form.password"
          type="password"
          label="Password"
          placeholder="••••••••"
          required
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
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import AdminLayout from '../components/layout/AdminLayout.vue'
import Card from '../components/ui/Card.vue'
import Table from '../components/ui/Table.vue'
import Modal from '../components/ui/Modal.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Button from '../components/ui/Button.vue'
import Dropdown from '../components/ui/Dropdown.vue'
import DropdownItem from '../components/ui/DropdownItem.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import { clinicianService } from '../services/clinicians'
import { departmentService } from '../services/departments'
import { specialtyService } from '../services/specialties'

const router = useRouter()
const notificationStore = useNotificationStore()

const clinicians = ref([])
const departments = ref([])
const specialties = ref([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const editingId = ref(null)
const loading = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  title: '',
  specialty: '',
  department: '',
  password: '',
})

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
]

const departmentOptions = computed(() =>
  departments.value.map((d) => ({ label: d.name, value: d.id }))
)

const specialtyOptions = computed(() =>
  specialties.value.map((s) => ({ label: s.name, value: s.id }))
)

const filteredClinicians = computed(() => {
  if (!searchQuery.value) return clinicians.value
  return clinicians.value.filter((c) =>
    `${c.first_name} ${c.last_name} ${c.email}`
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  )
})

const loadData = async () => {
  try {
    const [cliniciansData, departmentsData, specialtiesData] = await Promise.all([
      clinicianService.getAll(),
      departmentService.getAll(),
      specialtyService.getAll(),
    ])
    clinicians.value = cliniciansData || []
    departments.value = departmentsData || []
    specialties.value = specialtiesData || []
  } catch (error) {
    notificationStore.error('Failed to load data')
  }
}

const openAddModal = () => {
  editingId.value = null
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    specialty: '',
    department: '',
    password: '',
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const saveClinician = async () => {
  loading.value = true
  try {
    if (editingId.value) {
      await clinicianService.update(editingId.value, {
        first_name: form.value.firstName,
        last_name: form.value.lastName,
        title: form.value.title,
        specialty: form.value.specialty,
        department: form.value.department,
      })
      notificationStore.success('Clinician updated')
    } else {
      await clinicianService.create({
        first_name: form.value.firstName,
        last_name: form.value.lastName,
        email: form.value.email,
        title: form.value.title,
        specialty: form.value.specialty,
        department: form.value.department,
        password: form.value.password,
        status: 'active',
      })
      notificationStore.success('Clinician added')
    }
    closeModal()
    loadData()
  } catch (error) {
    notificationStore.error(error.message || 'Failed to save clinician')
  } finally {
    loading.value = false
  }
}

const viewClinician = (id) => {
  router.push(`/admin/clinicians/${id}`)
}

const editClinician = async (id) => {
  try {
    const clinician = await clinicianService.getById(id)
    form.value = {
      firstName: clinician.first_name,
      lastName: clinician.last_name,
      email: clinician.email,
      title: clinician.title,
      specialty: clinician.specialty,
      department: clinician.department,
      password: '',
    }
    editingId.value = id
    isModalOpen.value = true
  } catch (error) {
    notificationStore.error('Failed to load clinician details')
  }
}

const suspendClinician = async (id) => {
  try {
    await clinicianService.suspend(id)
    notificationStore.success('Clinician suspended')
    loadData()
  } catch (error) {
    notificationStore.error('Failed to suspend clinician')
  }
}

const activateClinician = async (id) => {
  try {
    await clinicianService.activate(id)
    notificationStore.success('Clinician activated')
    loadData()
  } catch (error) {
    notificationStore.error('Failed to activate clinician')
  }
}

const deleteClinician = async (id) => {
  if (confirm('Are you sure you want to delete this clinician?')) {
    try {
      await clinicianService.delete(id)
      notificationStore.success('Clinician deleted')
      loadData()
    } catch (error) {
      notificationStore.error('Failed to delete clinician')
    }
  }
}

onMounted(() => {
  loadData()
})
</script>
