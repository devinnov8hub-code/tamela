<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="sticky top-0 z-40 border-b border-border bg-background">
      <div class="flex items-center justify-between px-6 py-4">
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <div class="flex items-center gap-4">
          <button class="p-2 hover:bg-muted rounded-md" @click="toggleTheme">
            <font-awesome-icon
              :icon="isDark ? 'sun' : 'moon'"
              class="text-muted-foreground"
            />
          </button>
          <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            {{ userInitials }}
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="grid grid-cols-12 gap-6 p-6">
      <slot />
    </div>

    <!-- Notifications -->
    <NotificationCenter />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import NotificationCenter from '../ui/NotificationCenter.vue'
import { getInitials } from '../../utils/helpers'

defineProps({
  title: {
    type: String,
    default: 'Dashboard',
  },
})

const themeStore = useThemeStore()
const authStore = useAuthStore()

const isDark = computed(() => themeStore.isDark)

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const userInitials = computed(() => {
  const user = authStore.user
  if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
    return getInitials(`${user.user_metadata.first_name} ${user.user_metadata.last_name}`)
  }
  return user?.email?.charAt(0).toUpperCase() || 'U'
})
</script>
