<template>
  <RadioGroup
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <RadioGroupLabel class="block text-sm font-medium text-gray-700">
      {{ label }}
    </RadioGroupLabel>
    <div class="mt-1 -space-y-px rounded-md bg-white">
      <RadioGroupOption
        v-for="(option, index) in options"
        :key="option.value"
        v-slot="{ checked, active }"
        as="template"
        :value="option.value"
      >
        <div
          :class="[
            index == 0 && 'rounded-t-md',
            index == options.length - 1 && 'rounded-b-md',
            checked ? 'z-10 border-red-200 bg-red-50' : 'border-gray-200',
            'relative flex cursor-pointer border p-4 focus:outline-none'
          ]"
        >
          <span
            :class="[
              checked
                ? 'border-transparent bg-red-600'
                : 'border-gray-300 bg-white',
              active && 'ring-2 ring-red-500 ring-offset-2',
              'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border'
            ]"
            aria-hidden="true"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span class="ml-3 flex flex-col">
            <RadioGroupLabel
              as="span"
              :class="[
                checked ? 'text-red-900' : 'text-gray-900',
                'block text-sm font-medium'
              ]"
            >
              {{ option.label }}
            </RadioGroupLabel>
            <RadioGroupDescription
              as="span"
              :class="[
                checked ? 'text-red-700' : 'text-gray-500',
                'block text-sm'
              ]"
            >
              {{ option.description }}
            </RadioGroupDescription>
          </span>
        </div>
      </RadioGroupOption>
    </div>
  </RadioGroup>
</template>

<script>
import {
  RadioGroup,
  RadioGroupDescription,
  RadioGroupLabel,
  RadioGroupOption
} from '@headlessui/vue'

/* A choice of a few options in one panel, each with a line on what it means: [{ value, label, description }]. */
export default {
  name: 'RadioPanel',
  components: {
    RadioGroup,
    RadioGroupDescription,
    RadioGroupLabel,
    RadioGroupOption
  },
  props: {
    label: { type: String, required: true },
    options: { type: Array, required: true },
    modelValue: { type: String, default: '' }
  },
  emits: ['update:modelValue']
}
</script>
