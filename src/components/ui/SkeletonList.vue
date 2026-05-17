<template>
  <div class="space-y-2">
    <div v-for="i in count" :key="i" class="h-10 bg-muted rounded animate-pulse" />
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 5,
  },
})
</script>
