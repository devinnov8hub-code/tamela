<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-card border border-border rounded-lg shadow-lg p-8">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-primary mb-2">Forgot Password?</h1>
          <p class="text-sm text-muted-foreground">Enter your email to reset your password</p>
        </div>

        <!-- Form -->
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <!-- Email -->
          <Input
            v-model="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            required
            :error="errors.email"
          />

          <!-- Submit Button -->
          <Button
            type="submit"
            class="w-full"
            :loading="loading"
            :disabled="loading"
          >
            Send Reset Link
          </Button>
        </form>

        <!-- Links -->
        <div class="mt-6 text-center text-sm text-muted-foreground">
          Remember your password?
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
import { validateForm, resetPasswordSchema } from '../utils/validators'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const email = ref('')
const errors = ref({})
const loading = ref(false)

const handleSubmit = async () => {
  const validation = validateForm(resetPasswordSchema, {
    email: email.value,
  })

  if (!validation.valid) {
    errors.value = validation.errors
    return
  }

  loading.value = true
  errors.value = {}

  try {
    await authStore.resetPassword(email.value)
    notificationStore.success('Check your email for password reset instructions')
    router.push('/login')
  } catch (error) {
    notificationStore.error(error.message || 'Failed to send reset link')
  } finally {
    loading.value = false
  }
}
</script>
