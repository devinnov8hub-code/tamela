<template>
  <div class="min-h-screen bg-background flex">
    <!-- Sidebar -->
    <aside
      class="w-64 border-r border-border bg-card py-6 px-4 hidden md:block sticky top-0 h-screen overflow-y-auto"
    >
      <!-- Logo -->
      <div class="px-4 py-6">
        <h1 class="text-2xl font-bold text-primary">Taymela</h1>
      </div>

      <!-- Navigation -->
      <nav class="space-y-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          :class="{
            'bg-primary text-primary-foreground': isActive(item.path),
            'text-muted-foreground hover:bg-muted': !isActive(item.path),
          }"
        >
          <font-awesome-icon :icon="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- Divider -->
      <div class="my-6 border-t border-border" />

      <!-- Settings Section -->
      <nav class="space-y-2">
        <router-link
          to="/admin/settings"
          class="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
        >
          <font-awesome-icon icon="gear" class="w-4 h-4" />
          <span>Settings</span>
        </router-link>
        <button
          class="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted"
          @click="logout"
        >
          <font-awesome-icon icon="log-out" class="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto">
      <!-- Header -->
      <header class="sticky top-0 z-40 border-b border-border bg-background">
        <div class="flex items-center justify-between px-6 py-4">
          <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
          <div class="flex items-center gap-4">
            <button class="p-2 hover:bg-muted rounded-md" @click="toggleTheme">
              <font-awesome-icon
                :icon="isDark ? 'sun' : 'moon'"
                class="text-muted-foreground"
              />
            </button>
            <button
              class="p-2 hover:bg-muted rounded-md"
              @click="showUserMenu = !showUserMenu"
            >
              <div class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {{ userInitials }}
              </div>
            </button>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="p-6">
        <slot />
      </div>
    </main>

    <!-- Notifications -->
    <NotificationCenter />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from '../../stores/theme'
import { useAuthStore } from '../../stores/auth'
import NotificationCenter from '../ui/NotificationCenter.vue'
import { getInitials } from '../../utils/helpers'

defineProps({
  pageTitle: {
    type: String,
    default: 'Admin Dashboard',
  },
})

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const showUserMenu = ref(false)
const isDark = computed(() => themeStore.isDark)

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'home' },
  { label: 'Clinicians', path: '/admin/clinicians', icon: 'users' },
  { label: 'Reports', path: '/admin/reports', icon: 'file-lines' },
  { label: 'Departments', path: '/admin/departments', icon: 'building' },
  { label: 'Specialties', path: '/admin/specialties', icon: 'briefcase' },
]

const isActive = (path) => {
  return route.path.startsWith(path)
}

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

const logout = async () => {
  try {
    await authStore.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>
