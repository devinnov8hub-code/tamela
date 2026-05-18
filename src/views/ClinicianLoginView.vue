<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth.js";
import { getAuthSiteRedirectUrl, isSupabaseConfigured, supabase } from "../services/supabase";
import { UNAUTHORIZED_MESSAGE } from "../stores/auth.js";
import { safePostAuthRedirect } from "../utils/safeRedirect.js";

const router = useRouter();
const route = useRoute();
const { signInWithPassword, authError, hydrateSession, isAuthenticated, role, consumeSessionExpiredMessage } =
  useAuth();

const passwordVisible = ref(false);
const email = ref("");
const password = ref("");
const loading = ref(false);
const localError = ref("");

const passwordInputType = computed(() => (passwordVisible.value ? "text" : "password"));
const displayError = computed(() => localError.value || authError.value);

onMounted(async () => {
  if (route.query.error === "unauthorized") {
    localError.value = UNAUTHORIZED_MESSAGE;
  } else if (route.query.reason === "session") {
    const message = typeof route.query.message === "string" ? route.query.message : "";
    localError.value = message || "Your session expired. Please sign in again.";
  } else {
    const stored = consumeSessionExpiredMessage();
    if (stored) localError.value = stored;
  }

  await hydrateSession();

  if (isAuthenticated.value && role.value) {
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "";
    await router.replace(safePostAuthRedirect(redirect, role.value));
  }
});

async function handleSignIn() {
  localError.value = "";

  if (!isSupabaseConfigured || !supabase) {
    localError.value = "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.";
    return;
  }

  loading.value = true;
  try {
    const result = await signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (!result.ok) {
      localError.value = result.error || UNAUTHORIZED_MESSAGE;
      return;
    }

    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "";
    await router.replace(safePostAuthRedirect(redirect, role.value));
  } finally {
    loading.value = false;
  }
}

async function handleGoogleSignIn() {
  localError.value = "";
  if (!isSupabaseConfigured || !supabase) {
    localError.value = "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.";
    return;
  }
  loading.value = true;
  try {
    const site = getAuthSiteRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: site ? { redirectTo: site } : {},
    });
    if (error) localError.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function handleForgotPassword() {
  localError.value = "";
  if (!isSupabaseConfigured || !supabase) {
    localError.value = "Supabase is not configured.";
    return;
  }
  if (!email.value.trim()) {
    localError.value = "Enter your email address above, then try again.";
    return;
  }
  loading.value = true;
  try {
    const site = getAuthSiteRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: site ? `${site}/auth/login` : undefined,
    });
    if (error) localError.value = error.message;
    else if (!error) window.alert("If an account exists for that email, a reset link has been sent.");
  } finally {
    loading.value = false;
  }
}

function togglePasswordVisible() {
  passwordVisible.value = !passwordVisible.value;
}
</script>

<template>
  <main class="auth-page universal-login">
    <aside class="login-brand-panel" aria-hidden="true">
      <div class="login-brand-glow" />
      <img class="login-brand-mark" src="/logo%20auth%20page.png" alt="" />
    </aside>

    <section class="login-form-panel">
      <div class="login-form-panel-inner">
        <header class="login-form-header">
          <img class="login-logo-header" src="/logo-with-text.png" alt="Tamela" />
          <p class="login-tagline">Ai Clinical Assistant</p>
          <p class="login-register-line">
            <span class="login-register-muted">New hospital on Tamela?</span>
            <router-link :to="{ name: 'auth-admin-register' }" class="login-register-cta">Register your hospital &gt;</router-link>
          </p>
          <p class="login-register-line login-register-muted-only">
            Clinician accounts are created by your hospital administrator.
          </p>
        </header>

        <form class="login-form" @submit.prevent="handleSignIn">
          <p v-if="displayError" class="auth-form-message" role="alert">{{ displayError }}</p>

          <label for="login-email">Email Address</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="johndoe@gmail.com"
            required
          />

          <label for="login-password">Password</label>
          <div class="login-password-wrap">
            <input
              id="login-password"
              v-model="password"
              :type="passwordInputType"
              autocomplete="current-password"
              placeholder="Enter your password"
              required
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

          <div class="login-row">
            <label class="remember-wrap">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button type="button" class="link-btn" @click="handleForgotPassword">Forgot password?</button>
          </div>

          <button type="submit" class="primary-btn" :disabled="loading">
            {{ loading ? "Signing in…" : "Sign In" }}
          </button>
        </form>

        <div class="login-oauth-divider" role="presentation" />

        <button type="button" class="login-google-btn" :disabled="loading" @click="handleGoogleSignIn">
          <svg class="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </section>
  </main>
</template>
