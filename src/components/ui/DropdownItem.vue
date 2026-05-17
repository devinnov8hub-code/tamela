<template>
  <button
    class="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>
