<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { useAuth } from "../composables/useAuth.js";
import { fetchSpecialtiesByHospital } from "../services/specialtyService.js";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  activeNav: { type: String, default: "Home" },
  searchPlaceholder: { type: String, default: "Search by name, clinician ID, or status" },
  showSearch: { type: Boolean, default: true },
  showNotifications: { type: Boolean, default: false },
  /** Full-width pill search in header (transcription / reports pages). */
  wideSearch: { type: Boolean, default: false },
});

const searchValue = defineModel("searchValue", { type: String, default: "" });

const router = useRouter();
const { displayName, profile, hospitalId } = useAuth();

const navItems = [
  { label: "Active Recording", to: "/clinician/recording/fresh", icon: "microphone" },
  { label: "Reports", to: "/clinician/patients/library", icon: "file-lines" },
];

const { data: specialtiesList } = useQuery({
  queryKey: computed(() => ["specialties", hospitalId.value]),
  enabled: computed(() => Boolean(hospitalId.value)),
  queryFn: async () => {
    const { specialties, error } = await fetchSpecialtiesByHospital(hospitalId.value);
    if (error) throw error;
    return specialties;
  },
});

const roleSubtitle = computed(() => {
  const specId = profile.value?.specialty_id;
  if (specId) {
    const match = (specialtiesList.value ?? []).find((s) => s.id === specId);
    if (match?.name) return match.name;
  }
  return "Clinician";
});

function navigate(item) {
  if (!item.to) return;
  router.push(item.to);
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="logo-wrap">
        <img src="/logo-with-text.png" alt="Tamela logo" />
      </div>

      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          :class="['nav-item', { active: item.label === activeNav, disabled: !item.to }]"
          :disabled="!item.to"
          @click="navigate(item)"
        >
          <font-awesome-icon :icon="['fas', item.icon]" class="nav-icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="clinician-user-card">
        <span class="clinician-user-avatar"><font-awesome-icon :icon="['fas', 'user']" /></span>
        <div class="clinician-user-card-text">
          <p>{{ displayName }}</p>
          <small>{{ roleSubtitle }}</small>
        </div>
      </div>
    </aside>

    <main class="content-area">
      <header
        :class="[
          'top-bar',
          'top-bar--bordered',
          { compact: !title && !subtitle, 'top-bar--wide-search': wideSearch },
        ]"
      >
        <div v-if="title || subtitle" class="top-bar-titles">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="top-actions">
          <div v-if="showSearch" :class="['search', { 'search--wide': wideSearch }]">
            <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="search-icon" />
            <input
              v-model="searchValue"
              type="text"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
              autocomplete="off"
            />
            <button
              v-if="wideSearch && searchValue"
              type="button"
              class="search-clear"
              aria-label="Clear search"
              @click="searchValue = ''"
            >
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
          </div>
          <button v-if="showNotifications" class="icon-btn" aria-label="Notifications">
            <font-awesome-icon :icon="['fas', 'bell']" />
          </button>
          <slot name="top-actions-extra" />
        </div>
      </header>
      <slot />
    </main>
  </div>
</template>
