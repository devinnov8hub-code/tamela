<script setup>
import { onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "./stores/auth.js";
import { isSupabaseConfigured } from "./services/supabase.js";

const auth = useAuthStore();
const { ready } = storeToRefs(auth);

/** Failsafe if auth bootstrap hangs (network / bad token / env change during dev). */
const BOOT_FAILSAFE_MS = 16000;
let failsafeTimer;

onMounted(() => {
  if (!isSupabaseConfigured) return;

  failsafeTimer = window.setTimeout(() => {
    if (!ready.value) {
      auth.forceReady();
    }
  }, BOOT_FAILSAFE_MS);
});

onUnmounted(() => {
  if (failsafeTimer) window.clearTimeout(failsafeTimer);
});
</script>

<template>
  <div v-if="!ready" class="app-boot" aria-live="polite" aria-busy="true">
    <p>Loading…</p>
    <p v-if="isSupabaseConfigured" class="app-boot-hint">Connecting to Taymela…</p>
    <p v-else class="app-boot-hint app-boot-hint--warn">
      Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.
    </p>
  </div>
  <router-view v-else />
</template>

<style scoped>
.app-boot {
  min-height: 100vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: #475569;
  font-weight: 600;
}

.app-boot-hint {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
}

.app-boot-hint--warn {
  color: #b45309;
  max-width: 320px;
  text-align: center;
  line-height: 1.45;
}
</style>
