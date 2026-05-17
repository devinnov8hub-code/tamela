<template>
  <div
    :class="[
      'rounded-lg border border-border bg-card p-6',
      'shadow-sm transition-shadow hover:shadow-md',
    ]"
  >
    <slot />
  </div>
</template>

<script setup>
defineProps({
  class: String,
})
</script>
