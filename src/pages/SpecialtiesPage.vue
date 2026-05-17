<template>
  <AdminLayout page-title="Specialties">
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex-1 mr-4">
          <Input
            v-model="searchQuery"
            placeholder="Search specialties..."
            type="text"
          />
        </div>

        <Button @click="openAddModal">
          <font-awesome-icon icon="plus" class="mr-2" />
          Add Specialty
        </Button>
      </div>

      <!-- Table -->
      <Card>
        <Table
          v-if="filteredSpecialties.length"
          :rows="filteredSpecialties"
          :columns="columns"
          :page-size="10"
          :actions="true"
        >
          <template #actions="{ row }">
            <Dropdown>
              <DropdownItem @click="editSpecialty(row.id)">
                <font-awesome-icon icon="pencil" class="mr-2" />
                Edit
              </DropdownItem>

              <DropdownItem @click="deleteSpecialty(row.id)">
                <font-awesome-icon icon="trash" class="mr-2 text-destructive" />
                Delete
              </DropdownItem>
            </Dropdown>
          </template>
        </Table>

        <EmptyState
          v-else
          title="No specialties"
          message="Add your first specialty"
        />
      </Card>
    </div>

    <!-- Modal -->
    <Modal :is-open="isModalOpen" title="Specialty" @close="closeModal">
      
      <!-- FORM -->
      <form class="space-y-4" @submit.prevent="saveSpecialty">
        <Input
          v-model="form.name"
          label="Specialty Name"
          placeholder="General Practice"
          required
        />

        <Input
          v-model="form.code"
          label="Specialty Code"
          placeholder="GP"
          required
        />

        <Textarea
          v-model="form.description"
          label="Description"
          placeholder="Specialty description..."
          :rows="3"
        />
      </form>

      <!-- FOOTER SLOT (MOVED OUTSIDE FORM) -->
      <template #footer>
        <Button variant="outline" @click="closeModal">
          Cancel
        </Button>

        <Button
          :loading="loading"
          @click="saveSpecialty"
        >
          {{ editingId ? 'Update' : 'Add' }}
        </Button>
      </template>

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

import { specialtyService } from '../services/specialties'

const notificationStore = useNotificationStore()

const specialties = ref([])
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
  { key: 'name', label: 'Specialty Name' },
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
]

const filteredSpecialties = computed(() => {
  if (!searchQuery.value) return specialties.value

  return specialties.value.filter((s) =>
    `${s.name} ${s.code} ${s.description}`
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
  )
})

const loadData = async () => {
  try {
    specialties.value = (await specialtyService.getAll()) || []
  } catch (error) {
    notificationStore.error('Failed to load specialties')
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

const saveSpecialty = async () => {
  loading.value = true

  try {
    if (editingId.value) {
      await specialtyService.update(editingId.value, form.value)
      notificationStore.success('Specialty updated')
    } else {
      await specialtyService.create(form.value)
      notificationStore.success('Specialty added')
    }

    closeModal()
    loadData()
  } catch (error) {
    notificationStore.error('Failed to save specialty')
  } finally {
    loading.value = false
  }
}

const editSpecialty = async (id) => {
  try {
    const specialty = await specialtyService.getById(id)
    form.value = { ...specialty }
    editingId.value = id
    isModalOpen.value = true
  } catch (error) {
    notificationStore.error('Failed to load specialty')
  }
}

const deleteSpecialty = async (id) => {
  if (confirm('Delete this specialty?')) {
    try {
      await specialtyService.delete(id)
      notificationStore.success('Specialty deleted')
      loadData()
    } catch (error) {
      notificationStore.error('Failed to delete specialty')
    }
  }
}

onMounted(loadData)
</script>