<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AdminShell from "../components/AdminShell.vue";
import { adminClinicians } from "../data/adminClinicians";

const router = useRouter();
const clinicians = reactive(adminClinicians);

const searchTerm = ref("");
const showAddModal = ref(false);
const nextId = ref(9);

const newUser = reactive({
  firstName: "",
  lastName: "",
  title: "Dr",
  email: "",
  password: "",
});

const filteredClinicians = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  if (!query) return clinicians;

  return clinicians.filter((user) =>
    [user.name, user.email, user.employeeId, user.department, user.status].some((field) =>
      String(field).toLowerCase().includes(query)
    )
  );
});

const totalClinicians = computed(() => clinicians.length.toLocaleString());
const activeNow = computed(() => clinicians.filter((user) => user.status === "active").length.toLocaleString());
const pendingInvites = computed(() => clinicians.filter((user) => user.status === "pending").length.toLocaleString());

function displayStatus(status) {
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  return "Pending";
}

function toggleUserStatus(user) {
  user.status = user.status === "active" ? "suspended" : "active";
}

function openClinicianDetail(user) {
  router.push({ name: "admin-clinician-detail", params: { clinicianId: String(user.id) } });
}

function openAddModal() {
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
  newUser.password = "";
}

function addUser() {
  if (!newUser.firstName.trim() || !newUser.lastName.trim() || !newUser.email.trim() || !newUser.password.trim()) {
    return;
  }

  const generatedId = `RA-${String(nextId.value).padStart(3, "0")}`;
  const fullName = `${newUser.title}. ${newUser.firstName.trim()} ${newUser.lastName.trim()}`;

  clinicians.unshift({
    id: nextId.value,
    name: fullName,
    email: newUser.email.trim(),
    employeeId: generatedId,
    department: "Radiology",
    reports: 0,
    status: "pending",
  });
  nextId.value += 1;
  resetForm();
  closeAddModal();
}
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

    <section class="table-wrap admin-user-table-wrap">
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
          <tr v-for="row in filteredClinicians" :key="row.id" class="admin-user-row" @click="openClinicianDetail(row)">
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
            <font-awesome-icon :icon="['fas', 'users']" />
            Register Clinican
          </span>
        </div>

        <div class="admin-modal-form-grid two-cols">
          <label>
            First Name
            <input v-model="newUser.firstName" type="text" placeholder="John" />
          </label>
          <label>
            Last Name
            <input v-model="newUser.lastName" type="text" placeholder="Doe" />
          </label>
        </div>

        <div class="admin-modal-form-grid two-cols">
          <label>
            Title
            <input v-model="newUser.title" type="text" placeholder="Dr" />
          </label>
          <label>
            Email Address
            <input v-model="newUser.email" type="email" placeholder="johndoe@gmail.com" />
          </label>
        </div>

        <label class="admin-modal-password">
          Password
          <input v-model="newUser.password" type="password" placeholder="Enter your password" />
        </label>

        <div class="admin-modal-actions">
          <button type="button" class="admin-modal-btn ghost" @click="closeAddModal">Cancel</button>
          <button type="button" class="admin-modal-btn create" @click="addUser">Create Account</button>
        </div>
      </div>
    </div>
  </AdminShell>
</template>
