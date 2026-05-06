<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { isSupabaseConfigured, supabase } from "../services/supabase";

const router = useRouter();
const accountRole = ref("clinician");
const passwordVisible = ref(false);
const firstName = ref("");
const lastName = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const authError = ref("");
const authInfo = ref("");

const passwordInputType = computed(() => (passwordVisible.value ? "text" : "password"));

function postAuthPath() {
  return accountRole.value === "admin" ? "/admin/dashboard" : "/dashboard";
}

function togglePasswordVisible() {
  passwordVisible.value = !passwordVisible.value;
}

async function handleCreateAccount() {
  authError.value = "";
  authInfo.value = "";

  if (!isSupabaseConfigured || !supabase) {
    router.push(postAuthPath());
    return;
  }

  loading.value = true;
  try {
    const fullName = [firstName.value, lastName.value].map((s) => s.trim()).filter(Boolean).join(" ");
    // Do not pass deep paths as emailRedirectTo — GoTrue requires an exact allowlist match
    // (Authentication → URL Configuration). Omit to use the dashboard Site URL after email confirm.
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      options: {
        data: {
          full_name: fullName || undefined,
          app_role: accountRole.value,
        },
      },
    });
    if (error) {
      authError.value = error.message;
      return;
    }
    if (data.session) {
      await router.replace(postAuthPath());
      return;
    }
    authInfo.value =
      "Check your email to confirm your account. After confirming, you can sign in on the login page.";
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
        <header class="login-form-header login-form-header--solo-tagline">
          <img class="login-logo-header" src="/logo-with-text.png" alt="Tamela" />
          <p class="login-tagline">Ai Clinical Assistant</p>
        </header>

        <div class="login-role-toggle" role="group" aria-label="Account type">
          <button
            type="button"
            class="login-role-btn"
            :class="{ 'is-selected': accountRole === 'clinician' }"
            @click="accountRole = 'clinician'"
          >
            <font-awesome-icon :icon="['fas', 'user']" />
            Clinician
          </button>
          <button
            type="button"
            class="login-role-btn"
            :class="{ 'is-selected': accountRole === 'admin' }"
            @click="accountRole = 'admin'"
          >
            <font-awesome-icon :icon="['fas', 'user-shield']" />
            Admin
          </button>
        </div>

        <form class="login-form" @submit.prevent="handleCreateAccount">
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
              />
            </div>
          </div>

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
              minlength="6"
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

          <button type="submit" class="primary-btn" :disabled="loading">
            {{ loading ? "Creating account…" : "Create Account" }}
          </button>
        </form>

        <p class="login-form-footer-auth">
          <span class="login-register-muted">Have an account?</span>
          <router-link :to="{ name: 'login' }" class="login-register-cta">Log In &gt;</router-link>
        </p>
      </div>
    </section>
  </main>
</template>
