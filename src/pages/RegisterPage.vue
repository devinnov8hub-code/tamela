<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-card border border-border rounded-lg shadow-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">Create Account</h1>
          <p class="text-sm text-muted-foreground">Join Taymela today</p>
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleRegister">
          <!-- First Name -->
          <Input
            v-model="firstName"
            type="text"
            label="First Name"
            placeholder="John"
            required
            :error="errors.firstName"
          />

          <!-- Last Name -->
          <Input
            v-model="lastName"
            type="text"
            label="Last Name"
            placeholder="Doe"
            required
            :error="errors.lastName"
          />

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

          <!-- Confirm Password -->
          <Input
            v-model="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            required
            :error="errors.confirmPassword"
          />

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full"
            :loading="loading"
            :disabled="loading"
          >
            Create Account
          </Button>
        </form>

        <!-- Links -->
        <div class="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?
          <router-link to="/login" class="text-primary hover:underline">
            Sign in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notification'
import Input from '../components/ui/Input.vue'
import Button from '../components/ui/Button.vue'
import { validateForm, registerSchema } from '../utils/validators'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errors = ref({})
const loading = ref(false)

const handleRegister = async () => {
  const validation = validateForm(registerSchema, {
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  })

  if (!validation.valid) {
    errors.value = validation.errors
    return
  }

  loading.value = true
  errors.value = {}

  try {
    await authStore.signUp(email.value, password.value, {
      first_name: firstName.value,
      last_name: lastName.value,
      role: 'clinician',
    })
    notificationStore.success('Account created! Please check your email to verify your account.')
    router.push('/login')
  } catch (error) {
    notificationStore.error(error.message || 'Registration failed')
  } finally {
    loading.value = false
  }
}
</script>
