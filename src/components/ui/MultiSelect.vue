<script setup>
import { computed } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pilih opsi' },
  ariaLabel: { type: String, default: 'Pilih beberapa opsi' },
})
const emit = defineEmits(['update:modelValue'])
const emptyValue = '__EMPTY_FILTER_VALUE__'
const selectedValue = computed(() => props.modelValue.map(value => value === '' ? emptyValue : value))
const selectedLabel = computed(() => {
  if (!props.modelValue.length) return ''
  if (props.modelValue.length === props.options.length) return 'Semua dipilih'
  const labels = props.modelValue.map(value => props.options.find(option => option.value === value)?.label || value)
  return labels.length > 2 ? `${labels.length} dipilih` : labels.join(', ')
})
function update(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  emit('update:modelValue', values.map(item => item === emptyValue ? '' : item))
}
</script>

<template>
  <Select :model-value="selectedValue" :multiple="true" @update:model-value="update">
    <SelectTrigger class="multi-select-trigger" :aria-label="ariaLabel">
      <SelectValue :placeholder="placeholder">{{ selectedLabel }}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in options" :key="option.value || emptyValue" :value="option.value || emptyValue">{{ option.label }}</SelectItem>
    </SelectContent>
  </Select>
</template>
