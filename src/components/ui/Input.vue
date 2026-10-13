<script setup>
import { cn } from '@/lib/utils'

defineProps({ modelValue: String, type: { type: String, default: 'text' }, maxlength: Number, placeholder: String, disabled: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input :type="type" :value="modelValue" :maxlength="maxlength" :placeholder="placeholder" :disabled="disabled" class="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" @input="emit('update:modelValue', $event.target.value)">
</template>
