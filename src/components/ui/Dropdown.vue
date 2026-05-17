<template>
  <div class="relative inline-block text-left" ref="root">
    <button
      class="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
      @click="open = !open"
    >
      <font-awesome-icon icon="ellipsis" />
    </button>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md border border-border bg-background shadow-lg"
      >
        <div class="py-1">
          <slot />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const open = ref(false)
const root = ref(null)

const handleDocumentClick = (event) => {
  const el = root.value
  if (!el) return
  if (!(el === event.target || el.contains(event.target))) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>
