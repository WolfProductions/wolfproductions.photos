<template>
  <div class="flex flex-col">
    <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
        <div
          class="relative max-h-96 overflow-y-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
        >
          <table class="min-w-full table-fixed divide-y divide-gray-300">
            <thead class="sticky top-0 z-[1] bg-gray-50">
              <tr>
                <th scope="col" class="relative w-12 px-6 sm:w-16 sm:px-8">
                  <input
                    v-if="multiple && photos.length"
                    type="checkbox"
                    class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 sm:left-6"
                    :checked="selectedHere == photos.length"
                    :indeterminate="
                      selectedHere > 0 && selectedHere < photos.length
                    "
                    @change="selectAll($event.target.checked)"
                  />
                </th>
                <th
                  scope="col"
                  class="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                >
                  {{ prefix || '/' }}
                </th>
                <th
                  scope="col"
                  class="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                >
                  Date taken
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              <tr
                v-for="file in files"
                :key="file.key + file.name"
                :class="[
                  file.type == 'file' && 'cursor-pointer select-none',
                  isSelected(file) && 'bg-gray-50'
                ]"
                @click="file.type == 'file' && toggle(file, $event)"
              >
                <td class="relative w-12 px-6 sm:w-16 sm:px-8">
                  <div
                    v-if="isSelected(file)"
                    class="absolute inset-y-0 left-0 w-0.5 bg-red-600"
                  ></div>
                  <input
                    v-if="file.type == 'file' && multiple"
                    type="checkbox"
                    class="pointer-events-none absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 sm:left-6"
                    :checked="isSelected(file)"
                    tabindex="-1"
                  />
                  <CheckIcon
                    v-else-if="isSelected(file)"
                    class="h-5 w-5 text-red-500"
                  />
                </td>
                <td
                  :class="[
                    'flex items-center space-x-2 whitespace-nowrap py-1 pr-3 text-sm font-medium',
                    isSelected(file) ? 'text-red-600' : 'text-gray-900'
                  ]"
                >
                  <template v-if="file.type == 'folder'">
                    <FolderIcon class="h-5 w-5 text-gray-500" />
                    <span
                      class="cursor-pointer hover:underline"
                      @click="$emit('open', file.key)"
                      >{{ file.name }}</span
                    >
                  </template>
                  <span v-else>{{ file.name }}</span>
                </td>
                <td class="text-sm text-gray-500">
                  {{
                    file.created
                      ? moment(file.created).format('D MMM YYYY HH:mm:ss')
                      : ''
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-if="multiple || modelValue" class="mt-2 flex text-xs text-gray-500">
      <span v-if="multiple">{{ modelValue.length }} selected</span>
      <span v-else class="truncate">{{ modelValue }}</span>
      <button
        v-if="multiple ? modelValue.length : modelValue"
        type="button"
        class="ml-auto font-medium text-red-600 hover:text-red-500"
        @click="$emit('update:modelValue', multiple ? [] : '')"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import { CheckIcon, FolderIcon } from '@heroicons/vue/solid'

/**
 * Pick one photo (a key) or several (an array of keys, in the order they
 * were picked) from the entries of a library folder. Shift-click selects
 * the range from the previous click.
 */
export default {
  name: 'LibraryPicker',
  components: { CheckIcon, FolderIcon },
  props: {
    files: { type: Array, required: true },
    prefix: { type: String, default: '' },
    modelValue: { type: [String, Array], required: true },
    multiple: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'open'],
  data: () => ({ moment, lastClicked: null }),
  computed: {
    photos() {
      return this.files.filter((file) => file.type == 'file')
    },
    selectedHere() {
      return this.photos.filter((file) => this.isSelected(file)).length
    }
  },
  methods: {
    isSelected(file) {
      if (file.type != 'file') return false
      return this.multiple
        ? this.modelValue.includes(file.key)
        : this.modelValue == file.key
    },
    toggle(file, event) {
      if (!this.multiple) return this.$emit('update:modelValue', file.key)

      let keys = [file.key]
      if (event.shiftKey && this.lastClicked) {
        const from = this.photos.findIndex((p) => p.key == this.lastClicked)
        const to = this.photos.findIndex((p) => p.key == file.key)
        if (from > -1 && to > -1)
          keys = this.photos
            .slice(Math.min(from, to), Math.max(from, to) + 1)
            .map((p) => p.key)
      }
      this.lastClicked = file.key

      const select = event.shiftKey || !this.isSelected(file)
      this.$emit(
        'update:modelValue',
        select
          ? [...new Set([...this.modelValue, ...keys])]
          : this.modelValue.filter((key) => !keys.includes(key))
      )
    },
    selectAll(select) {
      const keys = this.photos.map((file) => file.key)
      this.$emit(
        'update:modelValue',
        select
          ? [...new Set([...this.modelValue, ...keys])]
          : this.modelValue.filter((key) => !keys.includes(key))
      )
    }
  }
}
</script>
