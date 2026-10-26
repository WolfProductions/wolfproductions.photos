<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75" />
      <div class="fixed inset-0 overflow-hidden">
        <div class="flex h-full items-center justify-center p-2 sm:p-6">
          <DialogPanel
            class="flex h-full max-h-[56rem] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl"
          >
            <div
              class="flex items-start justify-between border-b border-gray-200 px-4 py-4 sm:px-6"
            >
              <div>
                <DialogTitle class="text-lg font-medium text-gray-900">
                  {{ title }}
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500">
                  {{
                    multiple
                      ? 'Click a photo to add or remove it, shift-click to select everything in between. The numbers are the order they are shown in.'
                      : 'Click a photo to choose it, or double-click to choose it and close.'
                  }}
                </p>
              </div>
              <button
                type="button"
                class="ml-4 text-gray-400 hover:text-gray-600"
                @click="$emit('close')"
              >
                <XIcon class="h-5 w-5" />
                <span class="sr-only">Close</span>
              </button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <LibraryBrowser
                v-model="draft"
                :multiple="multiple"
                :vector="vector"
                :prefix="prefix"
                :labels="labels"
                @update:prefix="$emit('update:prefix', $event)"
                @loaded="here = $event.photos.map((photo) => photo.key)"
                @confirm="done()"
              />
            </div>

            <div
              class="flex flex-wrap items-center gap-3 border-t border-gray-200 px-4 py-3 sm:px-6"
            >
              <p class="min-w-0 flex-1 truncate text-sm text-gray-700">
                <template v-if="multiple">
                  {{ draft.length }} selected
                  <span v-if="elsewhere" class="text-gray-500"
                    >· {{ elsewhere }} in other folders</span
                  >
                </template>
                <template v-else>{{ draft || 'No photo chosen' }}</template>
              </p>
              <button
                v-if="multiple ? draft.length : draft"
                type="button"
                class="text-sm font-medium text-red-600 hover:text-red-500"
                @click="draft = multiple ? [] : ''"
              >
                {{ multiple ? 'Clear selection' : 'Remove' }}
              </button>
              <button
                type="button"
                class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                @click="$emit('close')"
              >
                Cancel
              </button>
              <button
                type="button"
                class="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                @click="done()"
              >
                Done
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script>
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot
} from '@headlessui/vue'
import { XIcon } from '@heroicons/vue/solid'

import LibraryBrowser from './LibraryBrowser.vue'

/**
 * Choose photos from the library in a dialog. The choice is only passed on
 * with Done; Cancel leaves it as it was. The folder being browsed (`prefix`)
 * belongs to the form, so every field of it opens where the last one was.
 */
export default {
  name: 'PhotoPickerDialog',
  components: {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionRoot,
    XIcon,
    LibraryBrowser
  },
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    modelValue: { type: [String, Array], required: true },
    multiple: { type: Boolean, default: false },
    /* Also offer vector images (SVG). */
    vector: { type: Boolean, default: false },
    prefix: { type: String, default: '' },
    labels: { type: Object, default: () => ({}) }
  },
  emits: ['close', 'update:modelValue', 'update:prefix'],
  /* `here`: the keys of the photos in the folder being browsed. */
  data: () => ({ draft: '', here: [] }),
  computed: {
    /* Selected photos that are not in the folder being browsed. */
    elsewhere() {
      if (!this.multiple) return 0
      const here = new Set(this.here)
      return this.draft.filter((key) => !here.has(key)).length
    }
  },
  methods: {
    done() {
      this.$emit('update:modelValue', this.draft)
      this.$emit('close')
    }
  },
  watch: {
    open: {
      immediate: true,
      handler(open) {
        if (!open) return
        this.draft = this.multiple ? [...this.modelValue] : this.modelValue

        /* One chosen photo opens at its own folder. */
        if (!this.multiple && this.modelValue) {
          const folder = this.modelValue.split('/').slice(0, -1).join('/')
          if (folder != this.prefix) this.$emit('update:prefix', folder)
        }
      }
    }
  }
}
</script>
