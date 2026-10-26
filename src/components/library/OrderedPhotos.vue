<template>
  <ul class="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
    <li
      v-for="(key, index) in shown"
      :key="key"
      draggable="true"
      :title="key.split('/').pop()"
      :class="[
        'group relative cursor-move rounded',
        dragged == index && 'opacity-40',
        dragged !== null &&
          over == index &&
          dragged != index &&
          'ring-2 ring-red-500 ring-offset-2'
      ]"
      @dragstart="dragStart(index, $event)"
      @dragenter.prevent="over = index"
      @dragover.prevent
      @drop.prevent="drop(index)"
      @dragend="dragged = over = null"
    >
      <LibraryPreview :photo-key="key" cover class="aspect-[3/2] rounded" />
      <span
        v-if="key == cover"
        class="absolute top-1 left-1 rounded-full bg-red-600 p-1 text-white shadow"
        :title="starredTitle"
      >
        <StarIcon class="h-3 w-3" />
      </span>
      <div
        class="absolute inset-0 flex flex-col justify-between p-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <div class="flex justify-between">
          <button
            v-if="key != cover"
            type="button"
            :class="BUTTON"
            :title="starTitle"
            @click="$emit('cover', key)"
          >
            <StarOutlineIcon class="h-4 w-4" />
            <span class="sr-only">{{ starTitle }}</span>
          </button>
          <span v-else />
          <button
            type="button"
            :class="BUTTON"
            title="Take out of the section"
            @click="remove(index)"
          >
            <XIcon class="h-4 w-4" />
            <span class="sr-only">Take out of the section</span>
          </button>
        </div>
        <div class="flex justify-between">
          <button
            type="button"
            :class="BUTTON"
            :disabled="index == 0"
            title="Move earlier"
            @click="move(index, index - 1)"
          >
            <ChevronLeftIcon class="h-4 w-4" />
            <span class="sr-only">Move earlier</span>
          </button>
          <button
            type="button"
            :class="BUTTON"
            :disabled="index == photos.length - 1"
            title="Move later"
            @click="move(index, index + 1)"
          >
            <ChevronRightIcon class="h-4 w-4" />
            <span class="sr-only">Move later</span>
          </button>
        </div>
      </div>
    </li>
    <li v-if="hidden">
      <button
        type="button"
        class="flex aspect-[3/2] w-full items-center justify-center rounded bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200"
        @click="expanded = true"
      >
        +{{ hidden }} more
      </button>
    </li>
  </ul>
</template>

<script>
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  XIcon
} from '@heroicons/vue/solid'
import { StarIcon as StarOutlineIcon } from '@heroicons/vue/outline'

import LibraryPreview from './LibraryPreview.vue'

/* How many photos a long section shows until it is opened up. */
const SHOWN = 23

/**
 * Photos in the order they are shown, such as those of a section: drag
 * them, or use the arrows, to change it. The star makes a photo the cover
 * (of an album, or the opening photo of the homepage).
 */
export default {
  name: 'OrderedPhotos',
  components: {
    ChevronLeftIcon,
    ChevronRightIcon,
    StarIcon,
    StarOutlineIcon,
    XIcon,
    LibraryPreview
  },
  props: {
    photos: { type: Array, required: true },
    /* The photo that has the star. */
    cover: { type: String, default: '' },
    starTitle: { type: String, default: 'Use as the cover' },
    starredTitle: { type: String, default: 'The cover of the album' }
  },
  emits: ['update:photos', 'cover'],
  data: () => ({
    BUTTON:
      'rounded bg-white bg-opacity-90 p-0.5 text-gray-700 shadow hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:invisible',
    dragged: null,
    over: null,
    expanded: false
  }),
  computed: {
    shown() {
      const all = this.photos
      return this.expanded || all.length <= SHOWN + 1
        ? all
        : all.slice(0, SHOWN)
    },
    hidden() {
      return this.photos.length - this.shown.length
    }
  },
  methods: {
    move(from, to) {
      const photos = [...this.photos]
      photos.splice(to, 0, ...photos.splice(from, 1))
      this.$emit('update:photos', photos)
    },
    remove(index) {
      this.$emit(
        'update:photos',
        this.photos.filter((key, i) => i != index)
      )
    },
    dragStart(index, event) {
      this.dragged = index
      event.dataTransfer.effectAllowed = 'move'
      /* Firefox only drags with data. */
      event.dataTransfer.setData('text/plain', this.photos[index])
    },
    drop(index) {
      /* Photos from another section are not moved over. */
      if (this.dragged === null) return
      if (this.dragged != index) this.move(this.dragged, index)
      this.dragged = this.over = null
    }
  }
}
</script>
