<template>
  <div class="flex flex-col">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <nav
        class="flex min-w-0 flex-1 items-center text-sm"
        aria-label="Folder in the library"
      >
        <button
          type="button"
          class="flex-shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          @click="$emit('open', '')"
        >
          <HomeIcon class="h-4 w-4" />
          <span class="sr-only">Library</span>
        </button>
        <template v-for="(crumb, index) in crumbs" :key="crumb.path">
          <ChevronRightIcon class="h-4 w-4 flex-shrink-0 text-gray-300" />
          <button
            type="button"
            :class="[
              'min-w-0 truncate rounded px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
              index == crumbs.length - 1
                ? 'font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            ]"
            :title="crumb.name"
            @click="$emit('open', crumb.path)"
          >
            {{ crumb.name }}
          </button>
        </template>
      </nav>

      <label
        v-if="multiple && !readonly && photos.length"
        class="flex items-center text-sm text-gray-700"
      >
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          :checked="selectedHere == photos.length"
          :indeterminate="selectedHere > 0 && selectedHere < photos.length"
          @change="selectAll($event.target.checked)"
        />
        <span class="ml-2">Select all {{ photos.length }}</span>
      </label>

      <span class="isolate inline-flex rounded-md shadow-sm">
        <button
          v-for="(option, index) in VIEWS"
          :key="option.value"
          type="button"
          :class="[
            'relative inline-flex items-center border border-gray-300 px-2 py-1.5 focus:z-10 focus:outline-none focus:ring-1 focus:ring-red-500',
            index == 0 ? 'rounded-l-md' : '-ml-px rounded-r-md',
            view == option.value
              ? 'bg-gray-100 text-gray-900'
              : 'bg-white text-gray-400 hover:bg-gray-50'
          ]"
          :aria-pressed="view == option.value"
          @click="setView(option.value)"
        >
          <component :is="option.icon" class="h-4 w-4" />
          <span class="sr-only">{{ option.label }}</span>
        </button>
      </span>
    </div>

    <p v-if="loading" class="mt-6 text-sm text-gray-500">Loading…</p>

    <template v-else>
      <div
        v-if="folders.length"
        class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        <button
          v-for="folder in folders"
          :key="folder.key"
          type="button"
          class="flex items-center rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          :title="folder.name"
          @click="$emit('open', folder.key)"
        >
          <FolderIcon class="mr-2 h-5 w-5 flex-shrink-0 text-gray-400" />
          <span class="truncate">{{ folder.name }}</span>
        </button>
      </div>

      <ul
        v-if="photos.length && view == 'grid'"
        class="mt-4 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
      >
        <li v-for="photo in photos" :key="photo.key">
          <button
            type="button"
            class="group relative block w-full select-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-default"
            :disabled="readonly"
            :aria-pressed="isSelected(photo)"
            :title="describe(photo)"
            @click="toggle(photo, $event)"
            @dblclick="!multiple && $emit('confirm')"
          >
            <LibraryPreview
              :photo-key="photo.key"
              :class="[
                'aspect-[3/2] w-full rounded-md transition',
                isSelected(photo)
                  ? 'ring-2 ring-red-600 ring-offset-2'
                  : !readonly && 'group-hover:opacity-80'
              ]"
            />
            <span
              v-if="isSelected(photo)"
              class="absolute top-1.5 left-1.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white shadow"
            >
              <template v-if="multiple">{{
                positions.get(photo.key)
              }}</template>
              <CheckIcon v-else class="h-4 w-4" />
            </span>
            <span
              v-else-if="!readonly"
              class="absolute top-1.5 left-1.5 h-6 w-6 rounded-full border-2 border-white bg-black bg-opacity-20 opacity-0 shadow group-hover:opacity-100"
            />
            <span
              v-if="labels[photo.key]"
              class="absolute inset-x-1.5 bottom-1.5 truncate rounded bg-black bg-opacity-60 px-1.5 py-0.5 text-left text-xs text-white"
            >
              In {{ labels[photo.key] }}
            </span>
          </button>
          <p
            :class="[
              'mt-1.5 truncate text-xs',
              isSelected(photo) ? 'font-medium text-red-600' : 'text-gray-500'
            ]"
          >
            {{ photo.name }}
          </p>
        </li>
      </ul>

      <table
        v-else-if="photos.length"
        class="mt-4 min-w-full divide-y divide-gray-200"
      >
        <thead>
          <tr>
            <th scope="col" class="w-16 py-2 pr-3"></th>
            <th
              scope="col"
              class="py-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Name
            </th>
            <th
              scope="col"
              class="py-2 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Taken
            </th>
            <th
              v-if="hasLabels"
              scope="col"
              class="py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Also in
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="photo in photos"
            :key="photo.key"
            :class="[
              'select-none',
              !readonly && 'cursor-pointer',
              isSelected(photo) ? 'bg-red-50' : !readonly && 'hover:bg-gray-50'
            ]"
            @click="toggle(photo, $event)"
            @dblclick="!multiple && $emit('confirm')"
          >
            <td class="relative py-1 pr-3">
              <LibraryPreview
                :photo-key="photo.key"
                class="aspect-[3/2] w-16 rounded"
              />
              <span
                v-if="isSelected(photo)"
                class="absolute top-0 left-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
              >
                <template v-if="multiple">{{
                  positions.get(photo.key)
                }}</template>
                <CheckIcon v-else class="h-3.5 w-3.5" />
              </span>
            </td>
            <td
              :class="[
                'whitespace-nowrap py-1 pr-3 text-sm',
                isSelected(photo) ? 'font-medium text-red-600' : 'text-gray-900'
              ]"
            >
              {{ photo.name }}
            </td>
            <td class="whitespace-nowrap py-1 pr-3 text-sm text-gray-500">
              {{ taken(photo) }}
            </td>
            <td v-if="hasLabels" class="py-1 text-sm text-gray-500">
              {{ labels[photo.key] }}
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!photos.length" class="mt-4 text-sm text-gray-500">
        {{
          folders.length
            ? 'There are no photos here, only folders.'
            : 'This folder is empty.'
        }}
      </p>
    </template>
  </div>
</template>

<script>
import moment from 'moment'
import {
  CheckIcon,
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  ViewGridIcon,
  ViewListIcon
} from '@heroicons/vue/solid'

import LibraryPreview from './LibraryPreview.vue'

const VIEW_KEY = 'libraryView'

function storedView() {
  try {
    return localStorage.getItem(VIEW_KEY) == 'list' ? 'list' : 'grid'
  } catch (e) {
    return 'grid'
  }
}

/**
 * Pick one photo (a key) or several (an array of keys, in the order they
 * were picked) from one folder of the library. Shift-click selects the range
 * from the previous click. `labels` marks photos that are used elsewhere,
 * such as in another section.
 */
export default {
  name: 'LibraryPicker',
  components: {
    CheckIcon,
    ChevronRightIcon,
    FolderIcon,
    HomeIcon,
    ViewGridIcon,
    ViewListIcon,
    LibraryPreview
  },
  props: {
    folders: { type: Array, required: true },
    photos: { type: Array, required: true },
    prefix: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    modelValue: { type: [String, Array], default: '' },
    multiple: { type: Boolean, default: false },
    /* Only browse, to see what is in a folder. */
    readonly: { type: Boolean, default: false },
    labels: { type: Object, default: () => ({}) }
  },
  emits: ['update:modelValue', 'open', 'confirm'],
  data: () => ({
    VIEWS: [
      { value: 'grid', label: 'Grid', icon: 'ViewGridIcon' },
      { value: 'list', label: 'List', icon: 'ViewListIcon' }
    ],
    view: storedView(),
    lastClicked: null
  }),
  computed: {
    crumbs() {
      const segments = this.prefix ? this.prefix.split('/') : []
      return segments.map((name, index) => ({
        name,
        path: segments.slice(0, index + 1).join('/')
      }))
    },
    /* Where each selected photo is in the selection, counting from 1. */
    positions() {
      return new Map(
        (this.multiple ? this.modelValue : []).map((key, index) => [
          key,
          index + 1
        ])
      )
    },
    selectedHere() {
      return this.photos.filter((photo) => this.isSelected(photo)).length
    },
    hasLabels() {
      return this.photos.some((photo) => this.labels[photo.key])
    }
  },
  methods: {
    setView(view) {
      this.view = view
      try {
        localStorage.setItem(VIEW_KEY, view)
      } catch (e) {
        /* Without storage the grid is shown next time. */
      }
    },
    taken(photo) {
      return photo.takenAt
        ? moment(photo.takenAt).format('D MMM YYYY HH:mm:ss')
        : ''
    },
    describe(photo) {
      return [photo.name, this.taken(photo)].filter(Boolean).join('\n')
    },
    isSelected(photo) {
      return this.multiple
        ? this.positions.has(photo.key)
        : this.modelValue == photo.key
    },
    toggle(photo, event) {
      if (this.readonly) return
      if (!this.multiple) return this.$emit('update:modelValue', photo.key)

      let keys = [photo.key]
      if (event.shiftKey && this.lastClicked) {
        const from = this.photos.findIndex((p) => p.key == this.lastClicked)
        const to = this.photos.findIndex((p) => p.key == photo.key)
        if (from > -1 && to > -1)
          keys = this.photos
            .slice(Math.min(from, to), Math.max(from, to) + 1)
            .map((p) => p.key)
      }
      this.lastClicked = photo.key

      const select = event.shiftKey || !this.isSelected(photo)
      this.$emit(
        'update:modelValue',
        select
          ? [...new Set([...this.modelValue, ...keys])]
          : this.modelValue.filter((key) => !keys.includes(key))
      )
    },
    selectAll(select) {
      const keys = this.photos.map((photo) => photo.key)
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
