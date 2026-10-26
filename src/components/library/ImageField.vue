<template>
  <div>
    <span class="block text-sm font-medium text-gray-700">{{ label }}</span>
    <p v-if="help" class="text-xs text-gray-500">{{ help }}</p>

    <div v-if="multiple" class="mt-2">
      <button
        type="button"
        class="group block w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        @click="open = true"
      >
        <span
          v-if="modelValue.length"
          class="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8"
        >
          <LibraryPreview
            v-for="key in shown"
            :key="key"
            :photo-key="key"
            cover
            class="aspect-[3/2] rounded group-hover:opacity-80"
          />
          <span
            v-if="hidden"
            class="flex aspect-[3/2] items-center justify-center rounded bg-gray-100 text-sm font-medium text-gray-600 group-hover:bg-gray-200"
          >
            +{{ hidden }}
          </span>
        </span>
        <span
          v-else
          class="flex h-20 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-500 group-hover:border-gray-400"
        >
          <PhotographIcon class="mr-2 h-5 w-5 text-gray-400" />
          No photos yet
        </span>
      </button>
      <div class="mt-2 flex items-center text-sm">
        <span class="text-gray-500">
          {{ modelValue.length }}
          {{ modelValue.length == 1 ? 'photo' : 'photos' }}
        </span>
        <button
          type="button"
          class="ml-4 font-medium text-red-600 hover:text-red-500"
          @click="open = true"
        >
          {{ modelValue.length ? 'Change…' : 'Choose photos…' }}
        </button>
      </div>
    </div>

    <div v-else class="mt-2 flex items-center">
      <button
        type="button"
        class="group w-36 flex-shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        @click="open = true"
      >
        <LibraryPreview
          v-if="modelValue"
          :photo-key="modelValue"
          class="aspect-[3/2] rounded-md ring-1 ring-gray-200 group-hover:opacity-80"
        />
        <span
          v-else
          class="flex aspect-[3/2] flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-xs text-gray-500 group-hover:border-gray-400"
        >
          <PhotographIcon class="mb-1 h-6 w-6 text-gray-400" />
          None
        </span>
      </button>
      <div class="ml-4 min-w-0 text-sm">
        <template v-if="modelValue">
          <p class="truncate font-medium text-gray-900" :title="modelValue">
            {{ name }}
          </p>
          <p class="truncate text-xs text-gray-500">{{ folder }}</p>
        </template>
        <div class="mt-1 flex space-x-4">
          <button
            type="button"
            class="font-medium text-red-600 hover:text-red-500"
            @click="open = true"
          >
            {{ modelValue ? 'Change…' : 'Choose…' }}
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
      </div>
    </div>

    <PhotoPickerDialog
      :open="open"
      :title="label"
      :model-value="modelValue"
      :multiple="multiple"
      :prefix="prefix"
      :labels="labels"
      @update:model-value="$emit('update:modelValue', $event)"
      @update:prefix="$emit('update:prefix', $event)"
      @close="open = false"
    />
  </div>
</template>

<script>
import { PhotographIcon } from '@heroicons/vue/outline'

import LibraryPreview from './LibraryPreview.vue'
import PhotoPickerDialog from './PhotoPickerDialog.vue'

/* How many photos of a selection are shown in the form. */
const SHOWN = 15

/**
 * A form field for one photo (a key) or several (an array of keys): a
 * preview of the choice, and the picker in a dialog.
 */
export default {
  name: 'ImageField',
  components: { PhotographIcon, LibraryPreview, PhotoPickerDialog },
  props: {
    label: { type: String, required: true },
    help: { type: String, default: '' },
    modelValue: { type: [String, Array], required: true },
    multiple: { type: Boolean, default: false },
    /* The folder of the library being browsed, shared by the fields of a form. */
    prefix: { type: String, default: '' },
    labels: { type: Object, default: () => ({}) }
  },
  emits: ['update:modelValue', 'update:prefix'],
  data: () => ({ open: false }),
  computed: {
    shown() {
      const all = this.modelValue
      return all.length > SHOWN + 1 ? all.slice(0, SHOWN) : all
    },
    hidden() {
      return this.modelValue.length - this.shown.length
    },
    name() {
      return this.modelValue.split('/').pop()
    },
    folder() {
      return this.modelValue.split('/').slice(0, -1).join(' / ')
    }
  }
}
</script>
