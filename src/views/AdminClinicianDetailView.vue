<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { USER_STATUS_ACTIVE, USER_STATUS_SUSPENDED } from "../constants/userStatus.js";
import { fetchDepartmentsByHospital } from "../services/departmentService.js";
import {
  fetchClinicianById,
  fetchDistinctPatientCount,
  fetchLastLoginForUser,
  setClinicianStatus,
  updateClinicianProfile,
} from "../services/clinicianService.js";
import { fetchReportsForClinician } from "../services/reportService.js";
import { fetchSpecialtiesByHospital, findOrCreateSpecialty } from "../services/specialtyService.js";
import { profileDisplayName } from "../utils/profileDisplay.js";
import { formatLastLogin, formatMemberSince, formatReportDate } from "../utils/formatDateTime.js";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { hospitalId, user: authUser } = useAuth();

const clinicianId = computed(() => String(route.params.clinicianId ?? ""));
const statusUpdating = ref(false);
const saving = ref(false);
const saveError = ref("");
const isEditMode = ref(false);
const editingField = ref(/** @type {string | null} */ (null));

const draft = reactive({
  title: "",
  firstname: "",
  lastname: "",
  specialtyName: "",
  departmentId: "",
  email: "",
});

const statusMeta = {
  active: { label: "ACTIVE", tone: "active" },
  suspended: { label: "SUSPENDED", tone: "suspended" },
  pending: { label: "PENDING", tone: "pending" },
  processing: { label: "Processing", tone: "processing" },
  completed: { label: "Completed", tone: "completed" },
};

function getMeta(status) {
  return statusMeta[status] || statusMeta.pending;
}

const {
  data: clinician,
  isLoading,
  isFetching: isClinicianFetching,
  isError,
  error: loadError,
} = useQuery({
  queryKey: computed(() => ["clinician", hospitalId.value, clinicianId.value]),
  enabled: computed(() => Boolean(hospitalId.value && clinicianId.value)),
  queryFn: async () => {
    const { clinician: row, error } = await fetchClinicianById(hospitalId.value, clinicianId.value);
    if (error) throw error;
    if (!row) throw new Error("Clinician not found.");
    return row;
  },
});

const { data: departmentsList } = useQuery({
  queryKey: computed(() => ["departments", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { departments, error } = await fetchDepartmentsByHospital(hospitalId.value);
    if (error) throw error;
    return departments;
  },
});

const { data: specialtiesList } = useQuery({
  queryKey: computed(() => ["specialties", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { specialties, error } = await fetchSpecialtiesByHospital(hospitalId.value);
    if (error) throw error;
    return specialties;
  },
});

const { data: lastLoginAt } = useQuery({
  queryKey: computed(() => ["clinician-last-login", clinicianId.value]),
  enabled: computed(() => Boolean(clinicianId.value)),
  queryFn: async () => {
    const { loginAt, error } = await fetchLastLoginForUser(clinicianId.value);
    if (error) throw error;
    return loginAt;
  },
});

const { data: patientCount, isLoading: patientsLoading } = useQuery({
  queryKey: computed(() => ["clinician-patients", hospitalId.value, clinicianId.value]),
  enabled: computed(() => Boolean(hospitalId.value && clinicianId.value)),
  queryFn: async () => {
    const { count, error } = await fetchDistinctPatientCount(hospitalId.value, clinicianId.value);
    if (error) throw error;
    return count;
  },
});

const { data: recentReports, isLoading: reportsLoading } = useQuery({
  queryKey: computed(() => ["clinician-reports", hospitalId.value, clinicianId.value]),
  enabled: computed(() => Boolean(hospitalId.value && clinicianId.value)),
  queryFn: async () => {
    const { reports, error } = await fetchReportsForClinician(hospitalId.value, clinicianId.value);
    if (error) throw error;
    return reports.map((row) => ({
      id: row.id,
      title: row.caseTitle,
      sessionType: row.sessionType,
      date: row.createdAt,
      status: row.status,
    }));
  },
});

function syncDraftFromClinician(row) {
  draft.title = row.title ?? "";
  draft.firstname = row.firstname ?? "";
  draft.lastname = row.lastname ?? "";
  draft.specialtyName = row.specialty === "—" ? "" : row.specialty;
  draft.departmentId = row.departmentId ?? "";
  draft.email = row.email ?? "";
}

watch(
  clinician,
  (row) => {
    if (row) syncDraftFromClinician(row);
  },
  { immediate: true }
);

const displayName = computed(() => {
  const title = draft.title.trim();
  const titled = title ? `${title.replace(/\.$/, "")}.` : "";
  const base = profileDisplayName(
    { firstname: draft.firstname, lastname: draft.lastname, email: draft.email },
    "Clinician"
  );
  return titled ? `${titled} ${base}` : base;
});

const roleLine = computed(() => draft.specialtyName.trim() || "Clinician");

const departmentLabel = computed(() => {
  if (!draft.departmentId) return "—";
  const match = (departmentsList.value ?? []).find((d) => d.id === draft.departmentId);
  return match?.name ?? "—";
});

const isDirty = computed(() => {
  const row = clinician.value;
  if (!row) return false;

  return (
    draft.title !== (row.title ?? "") ||
    draft.firstname !== (row.firstname ?? "") ||
    draft.lastname !== (row.lastname ?? "") ||
    draft.specialtyName !== (row.specialty === "—" ? "" : row.specialty) ||
    draft.departmentId !== (row.departmentId ?? "") ||
    draft.email !== (row.email ?? "")
  );
});

const memberSince = computed(() => {
  const createdAt = clinician.value?.createdAt;
  return createdAt ? formatMemberSince(createdAt) : "—";
});

const lastLoginLabel = computed(() => formatLastLogin(lastLoginAt.value));
const reportsList = computed(() => recentReports.value ?? []);
const departments = computed(() => departmentsList.value ?? []);
const specialties = computed(() => specialtiesList.value ?? []);

const primaryActionLabel = computed(() => {
  if (saving.value) return "Saving…";
  if (isEditMode.value) return "Save Changes";
  return "Edit Profile";
});

const primaryActionDisabled = computed(() => {
  if (saving.value || statusUpdating.value) return true;
  if (isEditMode.value) return !isDirty.value;
  return false;
});

const showCancelEdit = computed(() => isEditMode.value && !saving.value);

function enterEditMode(field = null) {
  isEditMode.value = true;
  if (field) editingField.value = field;
}

function exitEditMode() {
  isEditMode.value = false;
  editingField.value = null;
  saveError.value = "";
  if (clinician.value) syncDraftFromClinician(clinician.value);
}

function startEdit(field) {
  enterEditMode(field);
}

function stopEdit() {
  editingField.value = null;
}

function onPrimaryAction() {
  if (saving.value) return;

  if (!isEditMode.value) {
    enterEditMode();
    return;
  }

  if (isDirty.value) {
    saveChanges();
  }
}

function cancelEdit() {
  exitEditMode();
}

async function saveChanges() {
  if (!clinician.value || !hospitalId.value || !authUser.value?.id) return;

  saveError.value = "";
  saving.value = true;

  try {
    let specialtyId = null;
    const specialtyName = draft.specialtyName.trim();

    if (specialtyName) {
      const { specialty, error: specialtyError } = await findOrCreateSpecialty({
        hospitalId: hospitalId.value,
        name: specialtyName,
        createdBy: authUser.value.id,
      });

      if (specialtyError) {
        saveError.value = specialtyError.message || "Could not update specialty.";
        return;
      }

      specialtyId = specialty?.id ?? null;
    }

    const { clinician: updated, error } = await updateClinicianProfile({
      hospitalId: hospitalId.value,
      clinicianId: clinician.value.id,
      firstname: draft.firstname,
      lastname: draft.lastname,
      title: draft.title,
      email: draft.email,
      departmentId: draft.departmentId || null,
      specialtyId,
      updatedBy: authUser.value.id,
    });

    if (error || !updated) {
      saveError.value = error?.message || "Could not save changes.";
      return;
    }

    queryClient.setQueryData(["clinician", hospitalId.value, clinicianId.value], updated);
    syncDraftFromClinician(updated);
    exitEditMode();

    await queryClient.invalidateQueries({ queryKey: ["clinicians", hospitalId.value] });
    await queryClient.invalidateQueries({ queryKey: ["specialties", hospitalId.value] });
  } finally {
    saving.value = false;
  }
}

async function toggleSuspend() {
  if (!clinician.value) return;

  statusUpdating.value = true;
  try {
    const nextStatus =
      clinician.value.status === "active" ? USER_STATUS_SUSPENDED : USER_STATUS_ACTIVE;
    const result = await setClinicianStatus(clinician.value.id, nextStatus, {
      hospitalId: hospitalId.value,
      updatedBy: authUser.value?.id,
    });
    if (!result.ok) {
      window.alert(result.error || "Could not update profile status.");
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["clinician", hospitalId.value, clinicianId.value],
    });
    await queryClient.invalidateQueries({ queryKey: ["clinicians", hospitalId.value] });
  } finally {
    statusUpdating.value = false;
  }
}

function goBack() {
  router.push({ name: "admin-users" });
}
</script>

<template>
  <AdminShell title="" subtitle="" active-nav="User Management">
    <p v-if="!hospitalId" class="auth-form-message" role="alert">
      Hospital context is missing.
      <router-link :to="{ name: 'auth-login' }">Sign in again</router-link>
    </p>

    <section v-else-if="isLoading" class="clinician-page-loading" aria-busy="true" aria-live="polite">
      <div class="clinician-hero-card clinician-hero-card--loading">
        <div class="clinician-hero-avatar skeleton-line" />
        <div class="clinician-hero-main">
          <div class="skeleton-line medium" style="height: 44px; margin-bottom: 12px" />
          <div class="skeleton-line short" style="height: 22px" />
          <div class="skeleton-line short" style="height: 18px; margin-top: 12px" />
        </div>
        <div class="skeleton-line short" style="height: 44px; width: 140px; border-radius: 10px" />
      </div>
      <div class="clinician-detail-grid">
        <article class="clinician-account-card">
          <div class="skeleton-line short" style="height: 28px" />
          <div class="skeleton-line mt medium" />
          <div class="skeleton-line medium" />
          <div class="skeleton-line wide" />
        </article>
        <div class="clinician-side-panel">
          <div class="clinician-kpi-grid">
            <div class="skeleton-line" style="height: 100px; border-radius: 14px" />
            <div class="skeleton-line" style="height: 100px; border-radius: 14px" />
          </div>
          <div class="skeleton-line" style="height: 220px; border-radius: 14px" />
        </div>
      </div>
      <p class="auth-form-message auth-form-message--info clinician-loading-caption">Loading clinician…</p>
    </section>

    <p v-else-if="isError" class="auth-form-message" role="alert">
      {{ loadError?.message || "Could not load clinician." }}
      <button type="button" class="admin-inline-settings-link" @click="goBack">Back to User Management</button>
    </p>

    <template v-else-if="clinician">
      <p v-if="saveError" class="auth-form-message" role="alert">{{ saveError }}</p>

      <section
        class="clinician-hero-card"
        :class="{ 'clinician-hero-card--busy': saving || isClinicianFetching }"
        :aria-busy="saving || isClinicianFetching"
      >
        <div class="clinician-hero-avatar">
          <font-awesome-icon :icon="['fas', 'user-doctor']" />
        </div>
        <div class="clinician-hero-main">
          <div v-if="isEditMode && editingField === 'name'" class="clinician-inline-edit clinician-inline-edit--name">
            <input v-model="draft.title" type="text" class="clinician-inline-input clinician-inline-input--title" placeholder="Dr" @keydown.enter="stopEdit" />
            <input v-model="draft.firstname" type="text" class="clinician-inline-input" placeholder="First name" @keydown.enter="stopEdit" />
            <input v-model="draft.lastname" type="text" class="clinician-inline-input" placeholder="Last name" @keydown.enter="stopEdit" />
          </div>
          <h2
            v-else
            :class="['clinician-display-name', { 'clinician-editable': isEditMode }]"
            :tabindex="isEditMode ? 0 : -1"
            :role="isEditMode ? 'button' : undefined"
            :title="isEditMode ? 'Click to edit name' : undefined"
            @click="isEditMode && startEdit('name')"
            @keydown.enter="isEditMode && startEdit('name')"
          >
            {{ displayName }}
          </h2>

          <p class="clinician-role-line">
            <font-awesome-icon :icon="['fas', 'user-doctor']" />
            <input
              v-if="isEditMode && (editingField === 'role' || editingField === 'specialty')"
              v-model="draft.specialtyName"
              type="text"
              class="clinician-inline-input clinician-inline-input--role"
              placeholder="e.g. Radiologist"
              list="clinician-specialty-options"
              @blur="stopEdit"
              @keydown.enter="stopEdit"
            />
            <span
              v-else
              :class="['clinician-editable--inline', { 'clinician-editable': isEditMode }]"
              :tabindex="isEditMode ? 0 : -1"
              :role="isEditMode ? 'button' : undefined"
              :title="isEditMode ? 'Click to edit specialty' : undefined"
              @click="isEditMode && startEdit('role')"
              @keydown.enter="isEditMode && startEdit('role')"
            >
              {{ roleLine }}
            </span>
          </p>
          <datalist id="clinician-specialty-options">
            <option v-for="item in specialties" :key="item.id" :value="item.name" />
          </datalist>

          <div class="clinician-hero-meta">
            <span :class="['detail-badge', getMeta(clinician.status).tone]">
              {{ getMeta(clinician.status).label }}
            </span>
            <small>Member since {{ memberSince }}</small>
          </div>
        </div>
        <div class="clinician-hero-actions">
          <button
            v-if="showCancelEdit"
            type="button"
            class="clinician-cancel-btn"
            :disabled="saving"
            @click="cancelEdit"
          >
            Cancel
          </button>
          <button
            type="button"
            class="admin-add-user-btn"
            :class="{ 'is-loading': saving }"
            :disabled="primaryActionDisabled"
            :aria-busy="saving"
            @click="onPrimaryAction"
          >
            <span v-if="saving" class="btn-spinner" aria-hidden="true" />
            {{ primaryActionLabel }}
          </button>
          <p v-if="saving" class="clinician-saving-hint">Saving profile changes…</p>
        </div>
      </section>

      <section class="clinician-detail-grid">
        <article class="clinician-account-card" :class="{ 'clinician-account-card--busy': saving }">
          <header class="clinician-account-head">
            <h3>Account Information</h3>
            <button
              type="button"
              class="clinician-account-edit-btn"
              title="Edit account fields"
              :disabled="!isEditMode && saving"
              @click="enterEditMode('specialty')"
            >
              <font-awesome-icon :icon="['fas', 'pen-to-square']" />
            </button>
          </header>

          <div class="clinician-info-list">
            <div>
              <span>Specialty</span>
              <input
                v-if="isEditMode && editingField === 'specialty'"
                v-model="draft.specialtyName"
                type="text"
                class="clinician-inline-input clinician-inline-input--field"
                list="clinician-specialty-options"
                @blur="stopEdit"
                @keydown.enter="stopEdit"
              />
              <strong
                v-else
                :class="{ 'clinician-editable': isEditMode }"
                :tabindex="isEditMode ? 0 : -1"
                :role="isEditMode ? 'button' : undefined"
                @click="isEditMode && startEdit('specialty')"
                @keydown.enter="isEditMode && startEdit('specialty')"
              >
                {{ draft.specialtyName.trim() || "—" }}
              </strong>
            </div>
            <div>
              <span>Department</span>
              <select
                v-if="isEditMode && editingField === 'department'"
                v-model="draft.departmentId"
                class="clinician-inline-input clinician-inline-input--field"
                @blur="stopEdit"
                @change="stopEdit"
              >
                <option value="">—</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
              </select>
              <strong
                v-else
                :class="{ 'clinician-editable': isEditMode }"
                :tabindex="isEditMode ? 0 : -1"
                :role="isEditMode ? 'button' : undefined"
                @click="isEditMode && startEdit('department')"
                @keydown.enter="isEditMode && startEdit('department')"
              >
                {{ departmentLabel }}
              </strong>
            </div>
            <div>
              <span>Email Address</span>
              <input
                v-if="isEditMode && editingField === 'email'"
                v-model="draft.email"
                type="email"
                class="clinician-inline-input clinician-inline-input--field"
                @blur="stopEdit"
                @keydown.enter="stopEdit"
              />
              <strong
                v-else
                :class="{ 'clinician-editable': isEditMode }"
                :tabindex="isEditMode ? 0 : -1"
                :role="isEditMode ? 'button' : undefined"
                @click="isEditMode && startEdit('email')"
                @keydown.enter="isEditMode && startEdit('email')"
              >
                {{ draft.email || "—" }}
              </strong>
            </div>
            <div>
              <span>Last Login</span>
              <strong class="clinician-readonly">{{ lastLoginLabel }}</strong>
            </div>
          </div>

          <button
            type="button"
            class="detail-danger-btn"
            :class="{ 'is-loading': statusUpdating }"
            :disabled="statusUpdating || saving"
            :aria-busy="statusUpdating"
            @click="toggleSuspend"
          >
            <span v-if="statusUpdating" class="btn-spinner btn-spinner--light" aria-hidden="true" />
            <font-awesome-icon v-else :icon="['fas', clinician.status === 'active' ? 'user-slash' : 'user-check']" />
            {{ statusUpdating ? "Updating…" : clinician.status === "active" ? "Suspend Profile" : "Activate Profile" }}
          </button>
        </article>

        <div class="clinician-side-panel">
          <section class="clinician-kpi-grid">
            <article class="admin-user-metric-card" :aria-busy="patientsLoading">
              <span class="admin-metric-icon-wrap blue"><font-awesome-icon :icon="['fas', 'users']" /></span>
              <p>Total patients</p>
              <h3 v-if="patientsLoading" class="clinician-metric-loading">…</h3>
              <h3 v-else>{{ (patientCount ?? 0).toLocaleString() }}</h3>
            </article>
            <article class="admin-user-metric-card">
              <span class="admin-metric-icon-wrap amber"><font-awesome-icon :icon="['fas', 'file-lines']" /></span>
              <p>Reports Generated</p>
              <h3>{{ clinician.reports.toLocaleString() }}</h3>
            </article>
          </section>

          <section class="table-wrap clinician-report-table" :aria-busy="reportsLoading">
            <table>
              <thead>
                <tr>
                  <th>Case Title</th>
                  <th>Session Type</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="reportsLoading">
                  <td colspan="4" class="clinician-table-loading">Loading reports…</td>
                </tr>
                <tr v-else-if="reportsList.length === 0">
                  <td colspan="4">No reports yet for this clinician.</td>
                </tr>
                <tr v-for="report in reportsList" :key="report.id">
                  <td>{{ report.title }}</td>
                  <td>{{ report.sessionType }}</td>
                  <td>{{ formatReportDate(report.date) }}</td>
                  <td>
                    <span :class="['detail-badge', getMeta(report.status).tone]">
                      {{ getMeta(report.status).label }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </template>
  </AdminShell>
</template>
