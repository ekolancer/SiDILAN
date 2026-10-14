<script setup>
defineProps({ modelValue: { type: Array, default: () => [] }, options: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])
function update(event) {
  emit('update:modelValue', [...event.target.selectedOptions].map(option => option.value))
}
</script>

<template>
  <select multiple :value="modelValue" class="min-h-11 min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2" @change="update">
    <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
  </select>
</template>
