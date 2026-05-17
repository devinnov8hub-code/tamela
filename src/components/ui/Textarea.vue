<template>
  <div class="space-y-2">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {{ label }}
      <span v-if="required" class="text-destructive">*</span>
    </label>
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :rows="rows"
      :class="[
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        error && 'border-destructive',
      ]"
      @input="$emit('update:modelValue', $event.target.value)"
      @blur="$emit('blur')"
      v-bind="$attrs"
    />
    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { generateId } from '../../utils/helpers'

defineProps({
  modelValue: String,
  placeholder: String,
  label: String,
  error: String,
  disabled: Boolean,
  required: Boolean,
  rows: {
    type: Number,
    default: 4,
  },
})

defineEmits(['update:modelValue', 'blur'])

const id = computed(() => generateId())
</script>
