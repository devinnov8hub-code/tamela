<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchDepartmentsByHospital } from "../services/departmentService.js";
import { fetchCliniciansByHospital, inviteClinician, setClinicianStatus } from "../services/clinicianService.js";
import { fetchSpecialtiesByHospital, findOrCreateSpecialty } from "../services/specialtyService.js";
import { USER_STATUS_ACTIVE } from "../constants/userStatus.js";

const router = useRouter();
const queryClient = useQueryClient();
const { hospitalId, user: authUser } = useAuth();

const searchTerm = ref("");
const showAddModal = ref(false);
const passwordVisible = ref(false);
const formError = ref("");
const submitting = ref(false);

const newUser = reactive({
  firstName: "",
  lastName: "",
  title: "Dr",
  email: "",
  specialtyName: "",
  departmentId: "",
  password: "",
});

const cliniciansQueryKey = computed(() => ["clinicians", hospitalId.value]);

const {
  data: cliniciansData,
  isLoading,
  isError,
  error: cliniciansError,
  refetch: refetchClinicians,
} = useQuery({
  queryKey: cliniciansQueryKey,
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { clinicians: rows, error } = await fetchCliniciansByHospital(hospitalId.value);
    if (error) throw error;
    return rows;
  },
});

const { data: departmentsData } = useQuery({
  queryKey: computed(() => ["departments", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { departments: rows, error } = await fetchDepartmentsByHospital(hospitalId.value);
    if (error) throw error;
    return rows;
  },
});

const specialtiesQueryKey = computed(() => ["specialties", hospitalId.value]);

const { data: specialtiesData } = useQuery({
  queryKey: specialtiesQueryKey,
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { specialties: rows, error } = await fetchSpecialtiesByHospital(hospitalId.value);
    if (error) throw error;
    return rows;
  },
});

const clinicians = computed(() => cliniciansData.value ?? []);
const departments = computed(() => departmentsData.value ?? []);
const specialties = computed(() => specialtiesData.value ?? []);

const filteredClinicians = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  const list = clinicians.value;
  if (!query) return list;

  return list.filter((row) =>
    [row.name, row.email, row.employeeId, row.department, row.specialty, row.status].some((field) =>
      String(field).toLowerCase().includes(query)
    )
  );
});

const totalClinicians = computed(() => clinicians.value.length.toLocaleString());
const activeNow = computed(() => clinicians.value.filter((row) => row.status === "active").length.toLocaleString());
const pendingInvites = computed(() => "0");

const passwordInputType = computed(() => (passwordVisible.value ? "text" : "password"));

function displayStatus(status) {
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  return "Pending";
}

async function toggleUserStatus(clinician) {
  const nextStatus = clinician.status === "active" ? USER_STATUS_SUSPENDED : USER_STATUS_ACTIVE;
  const result = await setClinicianStatus(clinician.id, nextStatus);
  if (!result.ok) {
    window.alert(result.error || "Could not update user status.");
    return;
  }
  await refetchClinicians();
}

function openClinicianDetail(clinician) {
  router.push({ name: "admin-clinician-detail", params: { clinicianId: clinician.id } });
}

function openAddModal() {
  formError.value = "";
  showAddModal.value = true;
}

function closeAddModal() {
  showAddModal.value = false;
}

function resetForm() {
  newUser.firstName = "";
  newUser.lastName = "";
  newUser.title = "Dr";
  newUser.email = "";
  newUser.specialtyName = "";
  newUser.departmentId = "";
  newUser.password = "";
  passwordVisible.value = false;
}

function togglePasswordVisible() {
  passwordVisible.value = !passwordVisible.value;
}

async function addUser() {
  formError.value = "";

  if (!hospitalId.value || !authUser.value?.id) {
    formError.value = "Hospital context is missing. Sign in again as an administrator.";
    return;
  }

  if (!newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim() || !newUser.password.trim()) {
    formError.value = "Complete all required fields.";
    return;
  }

  submitting.value = true;
  try {
    let specialtyId = null;
    const specialtyName = newUser.specialtyName.trim();

    if (specialtyName) {
      const { specialty, error: specialtyError } = await findOrCreateSpecialty({
        hospitalId: hospitalId.value,
        name: specialtyName,
        createdBy: authUser.value.id,
      });

      if (specialtyError) {
        formError.value = specialtyError.message || "Could not save specialty.";
        return;
      }

      specialtyId = specialty?.id ?? null;
    }

    const result = await inviteClinician({
      email: newUser.email,
      password: newUser.password,
      firstname: newUser.firstName,
      lastname: newUser.lastName,
      hospitalId: hospitalId.value,
      createdBy: authUser.value.id,
      title: newUser.title,
      departmentId: newUser.departmentId || null,
      specialtyId,
    });

    if (!result.ok) {
      formError.value = result.error || "Could not create clinician account.";
      return;
    }

    resetForm();
    closeAddModal();
    await queryClient.invalidateQueries({ queryKey: cliniciansQueryKey.value });
    if (specialtyName) {
      await queryClient.invalidateQueries({ queryKey: specialtiesQueryKey.value });
    }
  } finally {
    submitting.value = false;
  }
}

watch(showAddModal, (open) => {
  if (!open) resetForm();
});
</script>

<template>
  <AdminShell
    title="User Management"
    subtitle="Manage clinicians, access, and onboarding status"
    active-nav="User Management"
    :search-value="searchTerm"
    @update:search-value="searchTerm = $event"
  >
    <template #top-actions-extra>
      <button type="button" class="admin-add-user-btn" @click="openAddModal">
        <font-awesome-icon :icon="['fas', 'plus']" />
        <span>Add New User</span>
      </button>
    </template>

    <p v-if="!hospitalId" class="auth-form-message" role="alert">
      Hospital context is missing. Please
      <router-link :to="{ name: 'auth-login' }">sign in again</router-link>
      as an administrator.
    </p>

    <section class="admin-user-metrics">
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap blue"><font-awesome-icon :icon="['fas', 'users']" /></span>
        <p>Total Clinicians</p>
        <h3>{{ totalClinicians }}</h3>
      </article>
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap purple"><font-awesome-icon :icon="['fas', 'bell']" /></span>
        <p>Active Now</p>
        <h3>{{ activeNow }}</h3>
      </article>
      <article class="admin-user-metric-card">
        <span class="admin-metric-icon-wrap amber"><font-awesome-icon :icon="['fas', 'clock']" /></span>
        <p>Pending Invites</p>
        <h3>{{ pendingInvites }}</h3>
      </article>
    </section>

    <p v-if="isLoading" class="auth-form-message auth-form-message--info">Loading clinicians…</p>
    <p v-else-if="isError" class="auth-form-message" role="alert">
      {{ cliniciansError?.message || "Could not load clinicians." }}
    </p>

    <section v-else class="table-wrap admin-user-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Clinician Name</th>
            <th>Employee ID</th>
            <th>Department</th>
            <th>Reports</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredClinicians.length === 0">
            <td colspan="6">No clinicians found for this hospital.</td>
          </tr>
          <tr
            v-for="row in filteredClinicians"
            :key="row.id"
            class="admin-user-row"
            @click="openClinicianDetail(row)"
          >
            <td>
              <div class="admin-clinician-cell">
                <span class="admin-clinician-avatar"><font-awesome-icon :icon="['fas', 'user-doctor']" /></span>
                <div>
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.email }}</small>
                </div>
              </div>
            </td>
            <td>{{ row.employeeId }}</td>
            <td>{{ row.department }}</td>
            <td>{{ row.reports.toLocaleString() }}</td>
            <td>
              <span :class="['admin-pill', row.status === 'active' ? 'active' : row.status === 'suspended' ? 'suspended' : 'pending']">
                {{ displayStatus(row.status) }}
              </span>
            </td>
            <td>
              <button
                type="button"
                :class="['admin-pill', row.status === 'active' ? 'suspended' : 'active', 'action']"
                @click.stop="toggleUserStatus(row)"
              >
                <font-awesome-icon :icon="['fas', row.status === 'active' ? 'user-slash' : 'user-check']" />
                {{ row.status === "active" ? "Suspend" : "Activate" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <div v-if="showAddModal" class="admin-modal-backdrop" @click.self="closeAddModal">
      <div class="admin-modal-card">
        <div class="admin-modal-head">
          <span class="admin-modal-chip">
            <font-awesome-icon :icon="['fas', 'user']" />
            Register Clinician
          </span>
        </div>

        <p v-if="formError" class="auth-form-message" role="alert">{{ formError }}</p>

        <div class="admin-modal-form-grid two-cols">
          <label>
            First Name
            <input v-model="newUser.firstName" type="text" placeholder="John" required />
          </label>
          <label>
            Last Name
            <input v-model="newUser.lastName" type="text" placeholder="Doe" required />
          </label>
        </div>

        <div class="admin-modal-form-grid two-cols">
          <label>
            Title
            <input v-model="newUser.title" type="text" placeholder="Dr" />
          </label>
          <label>
            Email Address
            <input v-model="newUser.email" type="email" placeholder="johndoe@gmail.com" required />
          </label>
        </div>

        <div class="admin-modal-form-grid two-cols">
          <label>
            Specialty
            <input
              v-model="newUser.specialtyName"
              type="text"
              placeholder="Sonography"
              list="specialty-options"
            />
            <datalist id="specialty-options">
              <option v-for="item in specialties" :key="item.id" :value="item.name" />
            </datalist>
            <router-link :to="{ name: 'admin-settings' }" class="admin-inline-settings-link" @click="closeAddModal">
              Add or manage specialties
            </router-link>
          </label>
          <label>
            Department
            <select v-model="newUser.departmentId">
              <option value="">Select department</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
            </select>
            <router-link :to="{ name: 'admin-settings' }" class="admin-inline-settings-link" @click="closeAddModal">
              Add or manage departments
            </router-link>
          </label>
        </div>

        <label class="admin-modal-password">
          Password
          <div class="login-password-wrap admin-modal-password-wrap">
            <input
              v-model="newUser.password"
              :type="passwordInputType"
              placeholder="Enter your password"
              required
              minlength="8"
            />
            <button
              type="button"
              class="login-password-toggle"
              :aria-pressed="passwordVisible"
              :aria-label="passwordVisible ? 'Hide password' : 'Show password'"
              @click="togglePasswordVisible"
            >
              <font-awesome-icon :icon="['fas', passwordVisible ? 'eye-slash' : 'eye']" />
            </button>
          </div>
        </label>

        <div class="admin-modal-actions">
          <button type="button" class="admin-modal-btn create" :disabled="submitting" @click="addUser">
            {{ submitting ? "Creating…" : "Create Account" }}
          </button>
        </div>
      </div>
    </div>
  </AdminShell>
</template>
