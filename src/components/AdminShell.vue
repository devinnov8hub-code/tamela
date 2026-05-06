<script setup>
import { useRouter } from "vue-router";
import { isSupabaseConfigured } from "../services/supabase";
import { signOut } from "../session/authSession";

defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  activeNav: { type: String, default: "Dashboard" },
  searchValue: { type: String, default: "" },
});

const emit = defineEmits(["update:searchValue"]);
const router = useRouter();

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

async function handleLogout() {
  await signOut();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="logo-wrap">
        <img src="/logo-with-text.png" alt="Tamela logo" />
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

      <footer class="admin-user-card">
        <span class="admin-user-avatar"><font-awesome-icon :icon="['fas', 'user-gear']" /></span>
        <div>
          <p>Stella Ngozi George</p>
          <small>System Administrator</small>
          <button
            v-if="isSupabaseConfigured"
            type="button"
            class="link-btn"
            style="display: block; margin-top: 8px; padding: 0"
            @click="handleLogout"
          >
            Sign out
          </button>
        </div>
      </footer>
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
              placeholder="Search by name, clinician ID, or status"
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
