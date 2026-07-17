<script setup>
import { computed, onBeforeUnmount, reactive, ref, useTemplateRef, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import AdminShell from "../components/AdminShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { createDepartment, fetchDepartmentsByHospital } from "../services/departmentService.js";
import {
  fetchHospitalById,
  updateHospitalIdentity,
  uploadHospitalLogo,
  validateHospitalLogoFile,
} from "../services/hospitalService.js";
import { createSpecialty, fetchSpecialtiesByHospital } from "../services/specialtyService.js";
import { requireSupabase } from "../services/supabase.js";

const searchTerm = ref("");
const newDepartmentName = ref("");
const departmentError = ref("");
const departmentSaving = ref(false);
const newSpecialtyName = ref("");
const specialtyError = ref("");
const specialtySaving = ref(false);

const logoInputRef = useTemplateRef("logoInput");
const pendingLogoFile = ref(null);
const pendingLogoPreviewUrl = ref("");
const identitySaving = ref(false);
const identityError = ref("");
const identitySuccess = ref("");
const passwordSaving = ref(false);
const passwordError = ref("");
const passwordSuccess = ref("");

const queryClient = useQueryClient();
const { hospitalId, user: authUser, hospitalName, hospitalLogoUrl, loadProfile } = useAuth();

const departmentsQueryKey = computed(() => ["departments", hospitalId.value]);
const hospitalQueryKey = computed(() => ["hospital", hospitalId.value]);

const { data: hospitalData, isLoading: hospitalLoading } = useQuery({
  queryKey: hospitalQueryKey,
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { hospital, error } = await fetchHospitalById(hospitalId.value);
    if (error) throw error;
    return hospital;
  },
});

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
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
});

const identityForm = reactive({
  legalName: "",
});

const displayedLogoUrl = computed(
  () => pendingLogoPreviewUrl.value || hospitalData.value?.logo_url || hospitalLogoUrl.value || ""
);

watch(
  () => hospitalData.value?.name ?? hospitalName.value ?? "",
  (name) => {
    if (name) identityForm.legalName = name;
  },
  { immediate: true }
);

function clearPendingLogoPreview() {
  if (pendingLogoPreviewUrl.value) {
    URL.revokeObjectURL(pendingLogoPreviewUrl.value);
    pendingLogoPreviewUrl.value = "";
  }
}

function openLogoPicker() {
  if (identitySaving.value) return;
  logoInputRef.value?.click();
}

function onLogoSelected(event) {
  identityError.value = "";
  identitySuccess.value = "";

  const file = event.target?.files?.[0];
  event.target.value = "";

  if (!file) return;

  const validationError = validateHospitalLogoFile(file);
  if (validationError) {
    identityError.value = validationError;
    return;
  }

  clearPendingLogoPreview();
  pendingLogoFile.value = file;
  pendingLogoPreviewUrl.value = URL.createObjectURL(file);
}

async function handleSaveIdentity() {
  identityError.value = "";
  identitySuccess.value = "";

  if (!hospitalId.value || !authUser.value?.id) {
    identityError.value = "Hospital context is missing. Sign in again.";
    return;
  }

  const trimmedName = identityForm.legalName.trim();
  if (!trimmedName) {
    identityError.value = "Enter the hospital legal name.";
    return;
  }

  const currentName = hospitalData.value?.name?.trim() || "";
  const nameChanged = trimmedName !== currentName;
  const hasLogo = Boolean(pendingLogoFile.value);

  if (!nameChanged && !hasLogo) {
    identityError.value = "No changes to save.";
    return;
  }

  identitySaving.value = true;
  try {
    if (hasLogo && pendingLogoFile.value) {
      const { error } = await uploadHospitalLogo(hospitalId.value, pendingLogoFile.value);
      if (error) {
        identityError.value = error.message || "Could not upload hospital logo.";
        return;
      }
      pendingLogoFile.value = null;
      clearPendingLogoPreview();
    }

    if (nameChanged) {
      const { hospital, error } = await updateHospitalIdentity(hospitalId.value, {
        name: trimmedName,
      });
      if (error || !hospital) {
        identityError.value = error?.message || "Could not update hospital name.";
        return;
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: hospitalQueryKey.value }),
      loadProfile(),
    ]);

    identitySuccess.value = "Hospital identity saved.";
  } finally {
    identitySaving.value = false;
  }
}

onBeforeUnmount(() => {
  clearPendingLogoPreview();
});

async function handleUpdatePassword() {
  passwordError.value = "";
  passwordSuccess.value = "";

  const current = securityForm.currentPassword;
  const next = securityForm.newPassword;
  const confirm = securityForm.confirmNewPassword;

  if (!current || !next || !confirm) {
    passwordError.value = "Fill in all password fields.";
    return;
  }

  if (next.length < 8) {
    passwordError.value = "New password must be at least 8 characters.";
    return;
  }

  if (next !== confirm) {
    passwordError.value = "New passwords do not match.";
    return;
  }

  const email = authUser.value?.email;
  if (!email) {
    passwordError.value = "Sign in again to update your password.";
    return;
  }

  passwordSaving.value = true;
  try {
    const client = requireSupabase();
    const { error: reauthError } = await client.auth.signInWithPassword({
      email,
      password: current,
    });

    if (reauthError) {
      passwordError.value = "Current password is incorrect.";
      return;
    }

    const { error } = await client.auth.updateUser({ password: next });
    if (error) {
      passwordError.value = error.message || "Could not update password.";
      return;
    }

    securityForm.currentPassword = "";
    securityForm.newPassword = "";
    securityForm.confirmNewPassword = "";
    passwordSuccess.value = "Password updated.";
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : "Could not update password.";
  } finally {
    passwordSaving.value = false;
  }
}

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
          <p v-if="hospitalLoading" class="auth-form-message auth-form-message--info">Loading hospital…</p>

          <div class="admin-identity-grid">
            <div>
              <label>Hospital logo</label>
              <input
                ref="logoInput"
                type="file"
                class="sr-only"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                :disabled="identitySaving"
                @change="onLogoSelected"
              />
              <button
                type="button"
                class="admin-logo-upload"
                :class="{ 'admin-logo-upload--has-image': Boolean(displayedLogoUrl) }"
                :disabled="identitySaving"
                aria-label="Upload hospital logo"
                @click="openLogoPicker"
              >
                <img
                  v-if="displayedLogoUrl"
                  :src="displayedLogoUrl"
                  alt="Hospital logo preview"
                  class="admin-logo-preview"
                />
                <template v-else>
                  <font-awesome-icon :icon="['fas', 'plus']" />
                  <strong>UPLOAD LOGO</strong>
                </template>
              </button>
              <small>PNG or JPG. Max 2MB</small>
            </div>
            <div class="admin-identity-fields">
              <label>
                Hospital Legal Name
                <input
                  v-model="identityForm.legalName"
                  type="text"
                  :placeholder="hospitalName || 'Hospital name'"
                  :disabled="identitySaving"
                />
              </label>
            </div>
          </div>

          <p v-if="identityError" class="auth-form-message" role="alert">{{ identityError }}</p>
          <p v-if="identitySuccess" class="auth-form-message auth-form-message--info" role="status">
            {{ identitySuccess }}
          </p>

          <div class="admin-settings-actions">
            <button
              type="button"
              class="admin-settings-btn"
              :disabled="identitySaving || hospitalLoading"
              @click="handleSaveIdentity"
            >
              {{ identitySaving ? "Saving…" : "Save Changes" }}
            </button>
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
              <input
                v-model="securityForm.currentPassword"
                type="password"
                autocomplete="current-password"
                placeholder="Current password"
                :disabled="passwordSaving"
              />
            </label>
            <span></span>
            <label>
              New Password
              <input
                v-model="securityForm.newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Enter New Password"
                :disabled="passwordSaving"
              />
            </label>
            <label>
              Confirm New Password
              <input
                v-model="securityForm.confirmNewPassword"
                type="password"
                autocomplete="new-password"
                placeholder="Repeat New Password"
                :disabled="passwordSaving"
              />
            </label>
          </div>
          <p v-if="passwordError" class="auth-form-message" role="alert">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="auth-form-message auth-form-message--info" role="status">
            {{ passwordSuccess }}
          </p>
          <div class="admin-settings-actions">
            <button
              type="button"
              class="admin-settings-btn"
              :disabled="passwordSaving"
              @click="handleUpdatePassword"
            >
              {{ passwordSaving ? "Updating…" : "Update Password" }}
            </button>
          </div>
        </div>
      </article>
    </section>
  </AdminShell>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.admin-logo-upload {
  margin-top: 8px;
  width: 150px;
  height: 150px;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  display: grid;
  place-items: center;
  color: #9ca3af;
  text-align: center;
  gap: 8px;
  padding: 0;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
}

.admin-logo-upload:hover:not(:disabled) {
  border-color: #94a3b8;
  color: #64748b;
}

.admin-logo-upload:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.admin-logo-upload--has-image {
  border-style: solid;
}

.admin-logo-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #fff;
}
</style>
