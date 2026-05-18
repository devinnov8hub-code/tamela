<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth.js";
import { isSupabaseConfigured } from "../services/supabase.js";
import { ROLE_ADMIN } from "../constants/roles.js";
import { safePostAuthRedirect } from "../utils/safeRedirect.js";

const router = useRouter();
const { signUpHospitalAdmin, hydrateSession, isAuthenticated, role } = useAuth();

const passwordVisible = ref(false);
const hospitalName = ref("");
const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const authError = ref("");
const authInfo = ref("");

const passwordInputType = computed(() => (passwordVisible.value ? "text" : "password"));

onMounted(async () => {
  await hydrateSession();
  if (isAuthenticated.value && role.value) {
    await router.replace(safePostAuthRedirect(undefined, role.value));
  }
});

function togglePasswordVisible() {
  passwordVisible.value = !passwordVisible.value;
}

async function handleCreateAccount() {
  authError.value = "";
  authInfo.value = "";

  if (!firstName.value.trim() || !lastName.value.trim()) {
    authError.value = "Enter your first and last name.";
    return;
  }

  if (!hospitalName.value.trim()) {
    authError.value = "Enter your hospital name.";
    return;
  }

  if (!isSupabaseConfigured) {
    authError.value = "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.";
    return;
  }

  loading.value = true;
  try {
    const result = await signUpHospitalAdmin({
      hospitalName: hospitalName.value,
      email: email.value,
      password: password.value,
      firstname: firstName.value.trim(),
      lastname: lastName.value.trim(),
    });

    if (!result.ok) {
      authError.value = result.error || "Registration failed.";
      return;
    }

    if (result.needsEmailConfirmation) {
      authInfo.value =
        "Check your email to confirm your account. After confirming, sign in to access your admin dashboard.";
      return;
    }

    await router.replace(safePostAuthRedirect(undefined, ROLE_ADMIN));
  } finally {
    loading.value = false;
  }
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
        <header class="login-form-header login-form-header--register">
          <img class="login-logo-header" src="/logo-with-text.png" alt="Tamela" />
          <p class="login-role-badge login-role-badge--static" aria-label="Administrator registration">
            <font-awesome-icon :icon="['fas', 'user-shield']" />
            Admin
          </p>
        </header>

        <form class="login-form login-form--register" @submit.prevent="handleCreateAccount">
          <p v-if="authError" class="auth-form-message" role="alert">{{ authError }}</p>
          <p v-if="authInfo" class="auth-form-message auth-form-message--info" role="status">{{ authInfo }}</p>

          <div class="register-name-row">
            <div>
              <label for="register-first-name">First Name</label>
              <input
                id="register-first-name"
                v-model="firstName"
                type="text"
                autocomplete="given-name"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label for="register-last-name">Last Name</label>
              <input
                id="register-last-name"
                v-model="lastName"
                type="text"
                autocomplete="family-name"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <label for="register-hospital-name">Hospital Name</label>
          <input
            id="register-hospital-name"
            v-model="hospitalName"
            type="text"
            autocomplete="organization"
            placeholder="General Hospital"
            required
          />

          <label for="register-email">Email Address</label>
          <input
            id="register-email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="johndoe@gmail.com"
            required
          />

          <label for="register-password">Password</label>
          <div class="login-password-wrap">
            <input
              id="register-password"
              v-model="password"
              :type="passwordInputType"
              autocomplete="new-password"
              placeholder="Enter your password"
              required
              minlength="8"
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

          <label class="register-terms">
            <input type="checkbox" name="terms" required />
            <span>
              I agree to the
              <a href="#" class="register-terms-link" @click.prevent>Terms &amp; Conditions</a>
            </span>
          </label>

          <button type="submit" class="primary-btn" :disabled="loading || Boolean(authInfo)">
            {{ loading ? "Creating account…" : "Create Account" }}
          </button>
        </form>

        <p class="login-form-footer-auth">
          <span class="login-register-muted">Have an account?</span>
          <router-link :to="{ name: 'auth-login' }" class="login-register-cta">Log In &gt;</router-link>
        </p>
      </div>
    </section>
  </main>
</template>
