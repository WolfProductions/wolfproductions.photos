<template>
  <select
    :value="modelValue || ''"
    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
    @change="$emit('update:modelValue', $event.target.value || null)"
  >
    <option v-if="allowTop" value="">(Top level)</option>
    <option v-else-if="!modelValue" value="" disabled>Choose a folder</option>
    <option
      v-for="folder in options"
      :key="folder._id"
      :value="folder._id"
      :disabled="excluded.has(folder._id)"
    >
      {{ folder.path }}
    </option>
  </select>
</template>

<script>
/* Choose a folder from the flat list of GET /api/folders, shown as its whole path. */
export default {
  name: 'FolderSelect',
  props: {
    modelValue: { type: String, default: null },
    options: { type: Array, required: true },
    allowTop: { type: Boolean, default: false },
    /* Ids that cannot be chosen, such as a folder itself and what is below it. */
    excluded: { type: Set, default: () => new Set() }
  },
  emits: ['update:modelValue']
}
</script>
