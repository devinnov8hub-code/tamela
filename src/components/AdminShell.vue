<script setup>
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth.js";

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  activeNav: { type: String, default: "Dashboard" },
  searchValue: { type: String, default: "" },
  searchPlaceholder: {
    type: String,
    default: "Search by name, clinician ID, or status",
  },
});

const emit = defineEmits(["update:searchValue"]);
const router = useRouter();
const { displayName, hospitalLogoUrl } = useAuth();

const navItems = [
  { label: "Dashboard", to: "/admin/dashboard", icon: "chart-line" },
  { label: "User Management", to: "/admin/users", icon: "users" },
  { label: "Reports", to: "/admin/reports", icon: "file-lines" },
  { label: "Settings", to: "/admin/settings", icon: "gear" },
];

function navigate(item) {
  if (!item.to) return;
  router.push(item.to);
}

</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="logo-wrap">
        <img
          v-if="hospitalLogoUrl"
          :src="hospitalLogoUrl"
          :alt="`${displayName} hospital logo`"
          class="hospital-brand-logo"
        />
        <img v-else src="/logo-with-text.png" alt="Tamela logo" />
      </div>

      <nav class="admin-nav-list">
        <button
          v-for="item in navItems"
          :key="item.label"
          type="button"
          :class="['admin-nav-item', { active: item.label === activeNav, disabled: !item.to }]"
          :disabled="!item.to"
          @click="navigate(item)"
        >
          <font-awesome-icon :icon="['fas', item.icon]" class="admin-nav-icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <button
        type="button"
        class="admin-user-card"
        :class="{ active: activeNav === 'Profile' }"
        @click="router.push({ name: 'admin-profile' })"
      >
        <span class="admin-user-avatar"><font-awesome-icon :icon="['fas', 'user']" /></span>
        <div class="admin-user-card-text">
          <p>{{ displayName }}</p>
          <small>System Administrator</small>
        </div>
      </button>
    </aside>

    <main class="admin-content-area">
      <header :class="['top-bar', { compact: !title && !subtitle }]">
        <div v-if="title || subtitle">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="top-actions">
          <div class="search">
            <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="search-icon" />
            <input
              type="text"
              :value="searchValue"
              :placeholder="searchPlaceholder"
              @input="emit('update:searchValue', $event.target.value)"
            />
          </div>
          <slot name="top-actions-extra" />
        </div>
      </header>
      <slot />
    </main>
  </div>
</template>
