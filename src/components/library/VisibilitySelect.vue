<template>
  <RadioGroup
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <RadioGroupLabel class="block text-sm font-medium text-gray-700">
      Who can see this
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
import { VISIBILITY_LABELS } from '../../utils/folders'

import {
  RadioGroup,
  RadioGroupDescription,
  RadioGroupLabel,
  RadioGroupOption
} from '@headlessui/vue'

export default {
  name: 'VisibilitySelect',
  components: {
    RadioGroup,
    RadioGroupDescription,
    RadioGroupLabel,
    RadioGroupOption
  },
  props: {
    modelValue: { type: String, default: 'inherit' },
    /* What 'inherit' comes down to where the item is. */
    inherited: { type: String, default: 'private' },
    /* A folder at the top has nothing above it to follow. */
    topLevel: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  computed: {
    options() {
      const descriptions = {
        inherit: this.topLevel
          ? 'There is no folder above it, so it is private.'
          : `Follows the folder above, so it is ${this.inherited} now.`,
        private: 'Only you, and whoever you give a share link.',
        public: 'Anyone, also without a link.'
      }
      return Object.entries(VISIBILITY_LABELS).map(([value, label]) => ({
        value,
        label,
        description: descriptions[value]
      }))
    }
  }
}
</script>
