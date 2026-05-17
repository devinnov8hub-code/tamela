<template>
  <div class="h-64 flex flex-col items-center justify-center text-center">
    <font-awesome-icon icon="inbox" class="text-4xl text-muted-foreground mb-4" />
    <h3 class="text-lg font-semibold mb-2">{{ title || 'No data found' }}</h3>
    <p class="text-sm text-muted-foreground">{{ message || 'Try adjusting your search or filters' }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  message: String,
})
</script>
