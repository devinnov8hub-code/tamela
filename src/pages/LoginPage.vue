<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-card border border-border rounded-lg shadow-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">Taymela</h1>
          <p class="text-muted-foreground">Healthcare AI Transcription Platform</p>
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Email -->
          <Input
            v-model="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            required
            :error="errors.email"
          />

          <!-- Password -->
          <Input
            v-model="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            required
            :error="errors.password"
          />

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full"
            :loading="loading"
            :disabled="loading"
          >
            Sign In
          </Button>
        </form>

        <!-- Links -->
        <div class="mt-6 space-y-4">
          <div class="text-center text-sm">
            <router-link
              to="/forgot-password"
              class="text-primary hover:underline"
            >
              Forgot password?
            </router-link>
          </div>
          <div class="text-center text-sm text-muted-foreground">
            Don't have an account?
            <router-link to="/register" class="text-primary hover:underline">
              Sign up
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notification'
import Input from '../components/ui/Input.vue'
import Button from '../components/ui/Button.vue'
import { validateForm, loginSchema } from '../utils/validators'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const email = ref('')
const password = ref('')
const errors = ref({})
const loading = ref(false)

const handleLogin = async () => {
  const validation = validateForm(loginSchema, {
    email: email.value,
    password: password.value,
  })

  if (!validation.valid) {
    errors.value = validation.errors
    return
  }

  loading.value = true
  errors.value = {}

  try {
    await authStore.signIn(email.value, password.value)
    notificationStore.success('Welcome back!')

    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (error) {
    notificationStore.error(error.message || 'Sign in failed')
  } finally {
    loading.value = false
  }
}
</script>
