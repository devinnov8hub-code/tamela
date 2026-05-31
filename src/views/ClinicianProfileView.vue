<script setup>
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import AppShell from "../components/AppShell.vue";
import { useAuth } from "../composables/useAuth.js";
import { fetchLastLoginForUser } from "../services/clinicianService.js";
import { fetchDepartmentsByHospital } from "../services/departmentService.js";
import { fetchSpecialtiesByHospital } from "../services/specialtyService.js";
import { profileDisplayName } from "../utils/profileDisplay.js";
import { formatLastLogin, formatMemberSince } from "../utils/formatDateTime.js";

const { profile, hospitalId, user, signOut } = useAuth();

const displayName = computed(() =>
  profileDisplayName(profile.value, "Clinician")
);

const memberSince = computed(() => formatMemberSince(profile.value?.created_at));

const { data: lastLoginAt } = useQuery({
  queryKey: computed(() => ["clinician-last-login", user.value?.id]),
  enabled: computed(() => Boolean(user.value?.id)),
  queryFn: async () => {
    const { loginAt, error } = await fetchLastLoginForUser(user.value.id);
    if (error) throw error;
    return loginAt;
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

const titleLabel = computed(() => {
  const t = profile.value?.title?.trim();
  return t ? `${t}.` : "—";
});

const firstName = computed(() => profile.value?.firstname?.trim() || "—");
const lastName = computed(() => profile.value?.lastname?.trim() || "—");
const emailLabel = computed(() => profile.value?.email?.trim() || user.value?.email || "—");

const departmentLabel = computed(() => {
  const deptId = profile.value?.department_id;
  if (!deptId) return "—";
  const match = (departmentsList.value ?? []).find((d) => d.id === deptId);
  return match?.name ?? "—";
});

const specialtyLabel = computed(() => {
  const specId = profile.value?.specialty_id;
  if (!specId) return "—";
  const match = (specialtiesList.value ?? []).find((s) => s.id === specId);
  return match?.name ?? "—";
});

const lastLoginLabel = computed(() => formatLastLogin(lastLoginAt.value));

const personalFields = computed(() => [
  { label: "Title", value: titleLabel.value },
  { label: "First Name", value: firstName.value },
  { label: "Last Name", value: lastName.value },
  { label: "Department", value: departmentLabel.value },
  { label: "Specialty", value: specialtyLabel.value },
  { label: "Email Address", value: emailLabel.value },
  { label: "Last login", value: lastLoginLabel.value },
]);

async function handleLogout() {
  await signOut();
}
</script>

<template>
  <AppShell
    title=""
    subtitle=""
    active-nav="Profile"
    :show-search="false"
  >
    <p v-if="!profile" class="auth-form-message" role="alert">
      Profile could not be loaded.
      <router-link :to="{ name: 'auth-login' }">Sign in again</router-link>
    </p>

    <template v-else>
      <section class="admin-profile-hero-card">
        <div class="admin-profile-hero-avatar" aria-hidden="true">
          <font-awesome-icon :icon="['fas', 'user']" />
        </div>
        <div class="admin-profile-hero-main">
          <h2 class="admin-profile-display-name">{{ displayName }}</h2>
          <p class="admin-profile-role-line">
            <font-awesome-icon :icon="['fas', 'stethoscope']" />
            {{ specialtyLabel !== "—" ? specialtyLabel : "Clinician" }}
          </p>
          <p class="admin-profile-member-since">Member since {{ memberSince }}</p>
        </div>
      </section>

      <article class="admin-profile-info-card">
        <header class="admin-profile-info-head">
          <h3>Personal Information</h3>
          <button type="button" class="admin-profile-edit-btn" title="Edit profile (coming soon)" disabled>
            <font-awesome-icon :icon="['fas', 'pen-to-square']" />
          </button>
        </header>

        <div class="admin-profile-info-grid">
          <div v-for="field in personalFields" :key="field.label" class="admin-profile-field">
            <span>{{ field.label }}</span>
            <strong>{{ field.value }}</strong>
          </div>
        </div>
      </article>

      <div class="admin-profile-logout-row">
        <button type="button" class="admin-profile-logout-btn" @click="handleLogout">
          <font-awesome-icon :icon="['fas', 'right-from-bracket']" />
          Log Out
        </button>
      </div>
    </template>
  </AppShell>
</template>
