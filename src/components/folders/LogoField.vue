<template>
  <div>
    <span class="block text-sm font-medium text-gray-700">Logo</span>
    <p class="text-xs text-gray-500">
      Shown in the top bar here and in everything inside, unless that has its
      own.
    </p>

    <button
      type="button"
      class="group mt-2 flex h-16 w-full max-w-lg items-center rounded-md border border-gray-200 bg-white px-4 shadow-sm hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      @click="open = true"
    >
      <LibraryPreview
        v-if="shown"
        :photo-key="shown"
        logo
        :class="['h-8 w-40 flex-shrink-0', !modelValue && 'opacity-40']"
      />
      <img
        v-else
        :src="SiteLogo"
        alt=""
        class="h-8 w-auto max-w-[10rem] flex-shrink-0 object-contain opacity-40"
      />
      <span
        class="ml-4 min-w-0 truncate border-l border-gray-200 pl-4 text-sm font-medium text-gray-900"
      >
        {{ title || 'New folder' }}
      </span>
    </button>

    <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span v-if="modelValue" class="min-w-0 truncate text-gray-500">
        {{ modelValue.split('/').pop() }}
      </span>
      <span v-else class="text-gray-500">
        Now the logo of
        {{ inherited ? inherited.from : 'WolfProductions' }}.
      </span>
      <button
        type="button"
        class="font-medium text-red-600 hover:text-red-500"
        @click="open = true"
      >
        {{ modelValue ? 'Change…' : 'Choose its own…' }}
      </button>
      <button
        v-if="modelValue"
        type="button"
        class="font-medium text-gray-500 hover:text-gray-700"
        @click="$emit('update:modelValue', '')"
      >
        Remove
      </button>
    </div>

    <PhotoPickerDialog
      :open="open"
      title="Logo"
      :model-value="modelValue"
      vector
      :prefix="prefix"
      @update:model-value="$emit('update:modelValue', $event)"
      @update:prefix="$emit('update:prefix', $event)"
      @close="open = false"
    />
  </div>
</template>

<script>
import SiteLogo from '../../assets/dark_text.svg'

import LibraryPreview from '../library/LibraryPreview.vue'
import PhotoPickerDialog from '../library/PhotoPickerDialog.vue'

/**
 * The logo of a folder, shown as the top bar will show it. Without one of
 * its own, the folder shows the logo it takes from the folders above.
 */
export default {
  name: 'LogoField',
  components: { LibraryPreview, PhotoPickerDialog },
  props: {
    modelValue: { type: String, default: '' },
    prefix: { type: String, default: '' },
    /* The title of the folder, next to the logo as in the top bar. */
    title: { type: String, default: '' },
    /* The logo it takes from above: { key, from }, or null for the site's own. */
    inherited: { type: Object, default: null }
  },
  emits: ['update:modelValue', 'update:prefix'],
  data: () => ({ SiteLogo, open: false }),
  computed: {
    shown() {
      return this.modelValue || this.inherited?.key || ''
    }
  }
}
</script>
