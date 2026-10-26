<template>
  <RadioPanel
    label="Who can see this"
    :options="options"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script>
import { VISIBILITY_LABELS } from '../../utils/folders'

import RadioPanel from './RadioPanel.vue'

export default {
  name: 'VisibilitySelect',
  components: { RadioPanel },
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
