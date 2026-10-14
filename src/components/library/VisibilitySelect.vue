<template>
  <fieldset>
    <legend class="block text-sm font-medium text-gray-700">
      Who can see this
    </legend>
    <div class="mt-2 space-y-2">
      <label
        v-for="(label, value) in VISIBILITY_LABELS"
        :key="value"
        class="flex items-center text-sm text-gray-700"
      >
        <input
          type="radio"
          :value="value"
          :checked="modelValue == value"
          class="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
          @change="$emit('update:modelValue', value)"
        />
        <span class="ml-2">
          {{ label }}
          <span v-if="value == 'inherit'" class="text-gray-500"
            >(now: {{ inherited }})</span
          >
          <span v-if="value == 'public'" class="text-gray-500"
            >(anyone can see it)</span
          >
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script>
import { VISIBILITY_LABELS } from '../../utils/folders'

export default {
  name: 'VisibilitySelect',
  props: {
    modelValue: { type: String, default: 'inherit' },
    /* What 'inherit' comes down to where the item is. */
    inherited: { type: String, default: 'private' }
  },
  emits: ['update:modelValue'],
  data: () => ({ VISIBILITY_LABELS })
}
</script>
