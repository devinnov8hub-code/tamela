<template>
  <div class="space-y-4">
    <!-- Table -->
    <div class="border border-border rounded-lg overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border bg-muted">
            <th
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-3 text-left text-sm font-semibold text-muted-foreground"
            >
              {{ column.label }}
            </th>
            <th v-if="actions" class="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in paginatedRows"
            :key="index"
            class="border-b border-border hover:bg-muted/50 transition-colors"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="px-4 py-3 text-sm"
            >
              <slot :name="'cell-' + column.key" :row="row">
                {{ row[column.key] }}
              </slot>
            </td>
            <td v-if="actions" class="px-4 py-3 text-sm">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Showing {{ startIndex + 1 }} to {{ endIndex }} of {{ totalRows }} results
      </p>
      <div class="flex gap-2">
        <button
          :disabled="currentPage === 1"
          class="px-3 py-2 border border-border rounded-md text-sm font-medium disabled:opacity-50"
          @click="currentPage = Math.max(1, currentPage - 1)"
        >
          <font-awesome-icon icon="chevron-left" />
        </button>
        <span class="px-3 py-2 text-sm">{{ currentPage }} / {{ totalPages }}</span>
        <button
          :disabled="currentPage === totalPages"
          class="px-3 py-2 border border-border rounded-md text-sm font-medium disabled:opacity-50"
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
        >
          <font-awesome-icon icon="chevron-right" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  rows: Array,
  columns: Array,
  pageSize: {
    type: Number,
    default: 10,
  },
  actions: Boolean,
})

const currentPage = ref(1)

const totalRows = computed(() => props.rows?.length || 0)
const totalPages = computed(() => Math.ceil(totalRows.value / props.pageSize))
const startIndex = computed(() => (currentPage.value - 1) * props.pageSize)
const endIndex = computed(() => Math.min(startIndex.value + props.pageSize, totalRows.value))

const paginatedRows = computed(() => {
  return props.rows?.slice(startIndex.value, endIndex.value) || []
})
</script>
