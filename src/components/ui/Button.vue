<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: { type: String, default: 'default' },
  size: { type: String, default: 'default' },
  disabled: Boolean,
  type: { type: String, default: 'button' },
})
const classes = computed(() => cn(
  'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  props.variant === 'default' && 'bg-blue-800 text-white hover:bg-blue-900',
  props.variant === 'outline' && 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  props.variant === 'ghost' && 'text-blue-800 hover:bg-blue-50',
  props.size === 'sm' && 'min-h-9 px-3',
  props.size === 'icon' && 'h-10 w-10 p-0',
))
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes"><slot /></button>
</template>
