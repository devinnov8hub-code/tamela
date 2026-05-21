<script setup>
import { computed } from "vue";
import { markdownToHtml } from "../utils/markdown.js";

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
});

const html = computed(() => markdownToHtml(props.content));
</script>

<template>
  <div v-if="html" class="clinical-markdown" v-html="html" />
  <p v-else class="clinical-markdown-empty">No clinical note content yet.</p>
</template>

<style scoped>
.clinical-markdown :deep(h2),
.clinical-markdown :deep(h3),
.clinical-markdown :deep(h4) {
  margin: 1rem 0 0.5rem;
  font-weight: 700;
  color: #0f172a;
}

.clinical-markdown :deep(h2:first-child),
.clinical-markdown :deep(h3:first-child),
.clinical-markdown :deep(h4:first-child) {
  margin-top: 0;
}

.clinical-markdown :deep(p) {
  margin: 0 0 0.75rem;
  line-height: 1.6;
  color: #334155;
}

.clinical-markdown :deep(ul) {
  margin: 0 0 0.75rem 1.25rem;
  padding: 0;
}

.clinical-markdown :deep(li) {
  margin-bottom: 0.35rem;
  line-height: 1.55;
  color: #334155;
}

.clinical-markdown :deep(.md-highlight) {
  color: #ea580c;
  font-weight: 600;
}

.clinical-markdown :deep(code) {
  font-family: ui-monospace, monospace;
  font-size: 0.92em;
}

.clinical-markdown-empty {
  color: #64748b;
  margin: 0;
}
</style>
