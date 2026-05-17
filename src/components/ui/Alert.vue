<template>
  <div
    v-if="show"
    :class="[
      'rounded-lg border-l-4 p-4 mb-4',
      variantClasses,
    ]"
  >
    <div class="flex items-start">
      <font-awesome-icon
        :icon="iconMap[type]"
        :class="['mt-0.5 mr-3', iconColorMap[type]]"
      />
      <div class="flex-1">
        <h3 v-if="title" class="font-semibold mb-1">{{ title }}</h3>
        <p class="text-sm">
          <slot>{{ message }}</slot>
        </p>
      </div>
      <button
        v-if="closable"
        class="ml-2 text-muted-foreground hover:text-foreground transition-colors"
        @click="close"
      >
        <font-awesome-icon icon="x" class="text-sm" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (v) => ['success', 'error', 'warning', 'info'].includes(v),
  },
  title: String,
  message: String,
  closable: Boolean,
})

const show = ref(true)

const variantClasses = {
  success: 'border-green-500 bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100',
  error: 'border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100',
  warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100',
}[props.type]

const iconMap = {
  success: 'check',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle',
}

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
}

const close = () => {
  show.value = false
}
</script>
