<script setup>
import { useRouter } from "vue-router";
import { isSupabaseConfigured } from "../services/supabase";
import { useAuth } from "../composables/useAuth.js";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  activeNav: { type: String, default: "Home" },
  searchPlaceholder: { type: String, default: "Search by name, clinician ID, or status" },
  showSearch: { type: Boolean, default: true },
  showNotifications: { type: Boolean, default: false },
});

const router = useRouter();
const { signOut } = useAuth();

const navItems = [
  { label: "Dashboard", to: "/clinician/dashboard", icon: "chart-line" },
  { label: "Active Recording", to: "/clinician/recording/fresh", icon: "microphone" },
];

function navigate(item) {
  if (!item.to) return;
  router.push(item.to);
}

async function handleLogout() {
  await signOut();
  router.push({ name: "auth-login" });
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
    </aside>

    <main class="content-area">
      <header :class="['top-bar', { compact: !title && !subtitle }]">
        <div v-if="title || subtitle">
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </div>
        <div class="top-actions">
          <div v-if="showSearch" class="search">
            <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="search-icon" />
            <input type="text" :placeholder="searchPlaceholder" />
          </div>
          <button v-if="showNotifications" class="icon-btn" aria-label="Notifications">
            <font-awesome-icon :icon="['fas', 'bell']" />
          </button>
          <button
            v-if="isSupabaseConfigured"
            type="button"
            class="link-btn"
            style="margin-left: 8px; font-weight: 600"
            @click="handleLogout"
          >
            Sign out
          </button>
        </div>
      </header>
      <slot/>
    </main>
  </div>
</template>