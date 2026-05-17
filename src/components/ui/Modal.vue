<template>
  <transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      @click.self="close"
    >
      <div
        class="bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4 animate-fade-in"
      >
        <div class="flex items-center justify-between p-6 border-b border-border">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            @click="close"
          >
            <font-awesome-icon icon="x" />
          </button>
        </div>

        <div class="p-6">
          <slot />
        </div>

        <div v-if="$slots.footer" class="flex items-center justify-end gap-2 p-6 border-t border-border">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  title: String,
})

defineEmits(['close'])

const close = () => {
  document.body.style.overflow = ''
  emit('close')
}

const emit = defineEmits(['close'])[0]

watch(
  () => isOpen,
  (newVal) => {
    if (newVal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)
</script>

<script>
import { watch } from 'vue'
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
