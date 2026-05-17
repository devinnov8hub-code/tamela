<template>
  <div class="flex items-center justify-center p-8">
    <div class="text-center">
      <font-awesome-icon icon="spinner" class="text-2xl text-primary animate-spin mb-4" />
      <p class="text-sm text-muted-foreground">{{ message || 'Loading...' }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: String,
})
</script>
