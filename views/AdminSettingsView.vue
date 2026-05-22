<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { createDepartment, fetchDepartmentsByHospital } from "../services/departmentService.js";
import { createSpecialty, fetchSpecialtiesByHospital } from "../services/specialtyService.js";

const searchTerm = ref("");
const newDepartmentName = ref("");
const departmentError = ref("");
const departmentSaving = ref(false);
const newSpecialtyName = ref("");
const specialtyError = ref("");
const specialtySaving = ref(false);

const queryClient = useQueryClient();
const { hospitalId, user: authUser, hospitalName } = useAuth();

const departmentsQueryKey = computed(() => ["departments", hospitalId.value]);

const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
  queryKey: departmentsQueryKey,
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { departments, error } = await fetchDepartmentsByHospital(hospitalId.value);
    if (error) throw error;
    return departments;
  },
});

const departments = computed(() => departmentsData.value ?? []);

const specialtiesQueryKey = computed(() => ["specialties", hospitalId.value]);

const { data: specialtiesData, isLoading: specialtiesLoading } = useQuery({
  queryKey: specialtiesQueryKey,
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { specialties, error } = await fetchSpecialtiesByHospital(hospitalId.value);
    if (error) throw error;
    return specialties;
  },
});

const specialties = computed(() => specialtiesData.value ?? []);

const securityForm = reactive({
  currentPassword: "..........",
  newPassword: "",
  confirmNewPassword: "",
});

const identityForm = reactive({
  legalName: "",
});

watch(
  hospitalName,
  (name) => {
    if (name) identityForm.legalName = name;
  },
  { immediate: true }
);

async function handleAddDepartment() {
  departmentError.value = "";

  if (!hospitalId.value || !authUser.value?.id) {
    departmentError.value = "Hospital context is missing. Sign in again.";
    return;
  }

  if (!newDepartmentName.value.trim()) {
    departmentError.value = "Enter a department name.";
    return;
  }

  departmentSaving.value = true;
  try {
    const { department, error } = await createDepartment({
      hospitalId: hospitalId.value,
      name: newDepartmentName.value,
      createdBy: authUser.value.id,
    });

    if (error || !department) {
      departmentError.value = error?.message || "Could not add department.";
      return;
    }

    newDepartmentName.value = "";
    await queryClient.invalidateQueries({ queryKey: departmentsQueryKey.value });
  } finally {
    departmentSaving.value = false;
  }
}

async function handleAddSpecialty() {
  specialtyError.value = "";

  if (!hospitalId.value || !authUser.value?.id) {
    specialtyError.value = "Hospital context is missing. Sign in again.";
    return;
  }

  if (!newSpecialtyName.value.trim()) {
    specialtyError.value = "Enter a specialty name.";
    return;
  }

  specialtySaving.value = true;
  try {
    const { specialty, error } = await createSpecialty({
      hospitalId: hospitalId.value,
      name: newSpecialtyName.value,
      createdBy: authUser.value.id,
    });

    if (error || !specialty) {
      specialtyError.value = error?.message || "Could not add specialty.";
      return;
    }

    newSpecialtyName.value = "";
    await queryClient.invalidateQueries({ queryKey: specialtiesQueryKey.value });
  } finally {
    specialtySaving.value = false;
  }
}
</script>

<template>
  <AdminShell
    title="Admin Settings"
    subtitle="Hospital profile, departments, specialties, and account security"
    active-nav="Settings"
    :search-value="searchTerm"
    @update:search-value="searchTerm = $event"
  >
    <section class="admin-settings-stack">
      <article class="admin-settings-card">
        <header class="admin-settings-head">
          <h3><font-awesome-icon :icon="['fas', 'file-lines']" /> Hospital Identity</h3>
        </header>
        <div class="admin-settings-body">
          <div class="admin-identity-grid">
            <div>
              <label>Hospital logo</label>
              <div class="admin-logo-upload">
                <font-awesome-icon :icon="['fas', 'plus']" />
                <strong>UPLOAD LOGO</strong>
              </div>
              <small>PNG or JPG. Max 2MB</small>
            </div>
            <div class="admin-identity-fields">
              <label>
                Hospital Legal Name
                <input v-model="identityForm.legalName" type="text" :placeholder="hospitalName || 'Hospital name'" />
              </label>
            </div>
          </div>
          <div class="admin-settings-actions">
            <button type="button" class="admin-settings-btn">Save Changes</button>
          </div>
        </div>
      </article>

      <article class="admin-settings-card">
        <header class="admin-settings-head admin-settings-head--split">
          <h3><font-awesome-icon :icon="['fas', 'users']" /> Departments</h3>
          <p class="admin-settings-subtext">Add departments for your hospital. They appear when registering clinicians.</p>
        </header>
        <div class="admin-settings-body">
          <p v-if="departmentsLoading" class="auth-form-message auth-form-message--info">Loading departments…</p>

          <form class="admin-department-add" @submit.prevent="handleAddDepartment">
            <label for="new-department-name">New department</label>
            <div class="admin-department-add-row">
              <input
                id="new-department-name"
                v-model="newDepartmentName"
                type="text"
                placeholder="e.g. Radiology, Cardiology, ER"
                :disabled="departmentSaving"
              />
              <button type="submit" class="admin-settings-btn" :disabled="departmentSaving">
                {{ departmentSaving ? "Adding…" : "Add Department" }}
              </button>
            </div>
            <p v-if="departmentError" class="auth-form-message" role="alert">{{ departmentError }}</p>
          </form>

          <ul v-if="departments.length" class="admin-department-list">
            <li v-for="dept in departments" :key="dept.id">
              <span>{{ dept.name }}</span>
            </li>
          </ul>
          <p v-else-if="!departmentsLoading" class="admin-settings-empty">No departments yet. Add your first department above.</p>
        </div>
      </article>

      <article class="admin-settings-card">
        <header class="admin-settings-head admin-settings-head--split">
          <h3><font-awesome-icon :icon="['fas', 'user-doctor']" /> Specialties</h3>
          <p class="admin-settings-subtext">
            Specialties are per hospital. New names typed when registering a clinician are added automatically.
          </p>
        </header>
        <div class="admin-settings-body">
          <p v-if="specialtiesLoading" class="auth-form-message auth-form-message--info">Loading specialties…</p>

          <form class="admin-department-add" @submit.prevent="handleAddSpecialty">
            <label for="new-specialty-name">New specialty</label>
            <div class="admin-department-add-row">
              <input
                id="new-specialty-name"
                v-model="newSpecialtyName"
                type="text"
                placeholder="e.g. Sonography, Cardiology"
                :disabled="specialtySaving"
              />
              <button type="submit" class="admin-settings-btn" :disabled="specialtySaving">
                {{ specialtySaving ? "Adding…" : "Add Specialty" }}
              </button>
            </div>
            <p v-if="specialtyError" class="auth-form-message" role="alert">{{ specialtyError }}</p>
          </form>

          <ul v-if="specialties.length" class="admin-department-list">
            <li v-for="item in specialties" :key="item.id">
              <span>{{ item.name }}</span>
            </li>
          </ul>
          <p v-else-if="!specialtiesLoading" class="admin-settings-empty">
            No specialties yet. Add one above or when registering a clinician.
          </p>
        </div>
      </article>

      <article class="admin-settings-card">
        <header class="admin-settings-head">
          <h3><font-awesome-icon :icon="['fas', 'user-gear']" /> Security &amp; Account</h3>
        </header>
        <div class="admin-settings-body">
          <div class="admin-settings-grid">
            <label>
              Current Password
              <input v-model="securityForm.currentPassword" type="password" />
            </label>
            <span></span>
            <label>
              New Password
              <input v-model="securityForm.newPassword" type="password" placeholder="Enter New Password" />
            </label>
            <label>
              Confirm New Password
              <input v-model="securityForm.confirmNewPassword" type="password" placeholder="Repeat New Password" />
            </label>
          </div>
          <div class="admin-settings-actions">
            <button type="button" class="admin-settings-btn">Update Password</button>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>
