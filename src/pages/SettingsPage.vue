<template>
  <ClinicianLayout page-title="Settings">
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Profile Section -->
      <Card>
        <h2 class="text-xl font-bold mb-6">Profile Settings</h2>
        <form class="space-y-4" @submit.prevent="saveProfile">
          <Input
            v-model="profileForm.firstName"
            label="First Name"
            placeholder="John"
            disabled
          />
          <Input
            v-model="profileForm.lastName"
            label="Last Name"
            placeholder="Doe"
            disabled
          />
          <Input
            v-model="profileForm.email"
            label="Email"
            type="email"
            disabled
          />
          <Button type="submit" :loading="profileLoading" disabled>
            Update Profile
          </Button>
        </form>
      </Card>

      <!-- Password Section -->
      <Card>
        <h2 class="text-xl font-bold mb-6">Change Password</h2>
        <form class="space-y-4" @submit.prevent="savePassword">
          <Input
            v-model="passwordForm.currentPassword"
            label="Current Password"
            type="password"
            placeholder="••••••••"
            required
          />
          <Input
            v-model="passwordForm.newPassword"
            label="New Password"
            type="password"
            placeholder="••••••••"
            required
            :error="passwordErrors.newPassword"
          />
          <Input
            v-model="passwordForm.confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            required
            :error="passwordErrors.confirmPassword"
          />
          <Button type="submit" :loading="passwordLoading">
            Change Password
          </Button>
        </form>
      </Card>

      <!-- Preferences Section -->
      <Card>
        <h2 class="text-xl font-bold mb-6">Preferences</h2>
        <form class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="font-medium">Dark Mode</label>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              :class="isDark ? 'bg-primary' : 'bg-gray-300'"
              @click="toggleTheme"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="isDark ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>
          <div class="flex items-center justify-between">
            <label class="font-medium">Email Notifications</label>
            <input type="checkbox" class="h-4 w-4" />
          </div>
        </form>
      </Card>
    </div>
  </ClinicianLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { useNotificationStore } from '../stores/notification'
import ClinicianLayout from '../components/layout/ClinicianLayout.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Button from '../components/ui/Button.vue'
import { validateForm, updatePasswordSchema } from '../utils/validators'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const notificationStore = useNotificationStore()

const profileForm = ref({
  firstName: authStore.user?.user_metadata?.first_name || '',
  lastName: authStore.user?.user_metadata?.last_name || '',
  email: authStore.user?.email || '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordErrors = ref({})
const profileLoading = ref(false)
const passwordLoading = ref(false)

const isDark = computed(() => themeStore.isDark)

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const saveProfile = async () => {
  profileLoading.value = true
  try {
    await authStore.updateUser({
      data: {
        first_name: profileForm.value.firstName,
        last_name: profileForm.value.lastName,
      },
    })
    notificationStore.success('Profile updated')
  } catch (error) {
    notificationStore.error('Failed to update profile')
  } finally {
    profileLoading.value = false
  }
}

const savePassword = async () => {
  const validation = validateForm(updatePasswordSchema, {
    currentPassword: passwordForm.value.currentPassword,
    newPassword: passwordForm.value.newPassword,
    confirmPassword: passwordForm.value.confirmPassword,
  })

  if (!validation.valid) {
    passwordErrors.value = validation.errors
    return
  }

  passwordLoading.value = true
  try {
    await authStore.updatePassword(passwordForm.value.newPassword)
    notificationStore.success('Password updated')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
    passwordErrors.value = {}
  } catch (error) {
    notificationStore.error('Failed to update password')
  } finally {
    passwordLoading.value = false
  }
}
</script>
