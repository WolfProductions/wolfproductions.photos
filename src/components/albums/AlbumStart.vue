<template>
  <div>
    <h3 class="text-lg font-medium leading-6 text-gray-900">New album</h3>
    <p class="mt-1 text-sm text-gray-500">
      Open the folder on the NAS with the photos of this album. Its name and
      date fill in the album, and its photos go in the first section.
    </p>

    <div class="mt-6 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <LibraryBrowser
        :prefix="prefix"
        readonly
        @update:prefix="$emit('update:prefix', $event)"
        @loaded="photos = $event.photos"
      />
    </div>

    <div
      class="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <label
        v-if="photos.length"
        class="mr-auto flex items-center text-sm text-gray-700"
      >
        <input
          v-model="withPhotos"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span class="ml-2">
          Put its {{ photos.length }}
          {{ photos.length == 1 ? 'photo' : 'photos' }} in the album
        </span>
      </label>
      <p v-else-if="prefix" class="mr-auto text-sm text-gray-500">
        There are no photos in this folder itself.
      </p>
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        @click="$emit('skip')"
      >
        Start empty
      </button>
      <button
        type="button"
        :disabled="!prefix"
        class="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        @click="use()"
      >
        Use this folder
      </button>
    </div>
  </div>
</template>

<script>
import moment from 'moment'
import { rememberStartFolder } from '../../utils/library'

import LibraryBrowser from '../library/LibraryBrowser.vue'

/**
 * A folder named '2022-05-21 - Bandjes Oerknal' is the album 'Bandjes
 * Oerknal' of 21 May 2022. Without a date in front, the name is the title.
 */
function fromName(name) {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})(?:\s*[-–_]?\s*(.*))?$/)
  if (match && moment(match[1], 'YYYY-MM-DD', true).isValid())
    return { date: match[1], title: (match[2] || '').trim() }
  return { date: null, title: name }
}

/* The first step of a new album: choose the folder on the NAS it is made from. */
export default {
  name: 'AlbumStart',
  components: { LibraryBrowser },
  props: {
    /* The folder of the library being browsed, shared with the form. */
    prefix: { type: String, default: '' }
  },
  emits: ['update:prefix', 'start', 'skip'],
  data: () => ({ photos: [], withPhotos: true }),
  methods: {
    use() {
      const segments = this.prefix.split('/')
      const { date, title } = fromName(segments[segments.length - 1])
      const taken = this.photos.map((photo) => photo.takenAt).filter(Boolean)

      rememberStartFolder(segments.slice(0, -1).join('/'))

      this.$emit('start', {
        folder: this.prefix,
        title,
        /* Otherwise the day the first photo was taken. */
        date: date || (taken.length ? taken.sort()[0].slice(0, 10) : null),
        photos: this.withPhotos ? this.photos.map((photo) => photo.key) : []
      })
    }
  }
}
</script>
