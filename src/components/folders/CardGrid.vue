<template>
  <ul
    role="list"
    class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8"
  >
    <li
      v-for="(item, index) in items"
      :key="item._id"
      :draggable="ordering"
      :class="[
        'relative',
        ordering && 'cursor-move',
        ordering && dragged == index && 'opacity-40'
      ]"
      @dragstart="ordering && dragStart(index, $event)"
      @dragenter.prevent="ordering && (over = index)"
      @dragover.prevent
      @drop.prevent="ordering && drop(index)"
      @dragend="dragged = over = null"
    >
      <div
        :class="[
          'group aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-rose-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100',
          dragged !== null &&
            over == index &&
            dragged != index &&
            'ring-2 ring-rose-500 ring-offset-2'
        ]"
      >
        <img
          v-if="item.cover"
          :src="getPhotoUrl(item.cover, 'medium')"
          alt=""
          :class="[
            'pointer-events-none object-cover',
            !ordering && 'group-hover:opacity-75'
          ]"
        />
        <div
          v-else
          class="pointer-events-none flex items-center justify-center text-gray-300"
        >
          <FolderIcon v-if="kindOf(item) == 'folder'" class="h-12 w-12" />
          <PhotographIcon v-else class="h-12 w-12" />
        </div>
        <div v-if="ordering" class="flex items-end justify-between p-2">
          <button
            type="button"
            :class="BUTTON"
            :disabled="index == 0"
            title="Move earlier"
            @click="move(index, index - 1)"
          >
            <ChevronLeftIcon class="h-5 w-5" />
            <span class="sr-only">Move {{ item.title }} earlier</span>
          </button>
          <span
            class="rounded bg-white bg-opacity-90 px-2 py-0.5 text-sm font-semibold text-gray-700 shadow"
            >{{ index + 1 }}</span
          >
          <button
            type="button"
            :class="BUTTON"
            :disabled="index == items.length - 1"
            title="Move later"
            @click="move(index, index + 1)"
          >
            <ChevronRightIcon class="h-5 w-5" />
            <span class="sr-only">Move {{ item.title }} later</span>
          </button>
        </div>
        <template v-else>
          <router-link
            :to="`/${kindOf(item) == 'folder' ? 'f' : 'a'}/${item._id}`"
            class="absolute inset-0 focus:outline-none"
          >
            <span class="sr-only">Open {{ item.title }}</span>
          </router-link>
          <div
            v-if="item.effectiveVisibility"
            class="pointer-events-none flex items-start justify-end p-2"
          >
            <VisibilityBadge
              :visibility="item.effectiveVisibility"
              :inherited="item.visibility == 'inherit'"
            />
          </div>
        </template>
      </div>
      <div class="pointer-events-none mt-2 flex items-center space-x-1.5">
        <FolderIcon
          v-if="kindOf(item) == 'folder'"
          class="h-4 w-4 flex-shrink-0 text-gray-400"
        />
        <p class="truncate text-sm font-medium text-gray-900">
          {{ item.title }}
        </p>
      </div>
      <p
        v-if="kindOf(item) == 'album' && item.date"
        class="pointer-events-none block text-sm font-medium text-gray-500"
      >
        {{ moment(item.date).fromNow() }}
      </p>
    </li>
  </ul>
</template>

<script>
import moment from 'moment'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  PhotographIcon
} from '@heroicons/vue/solid'

import VisibilityBadge from './VisibilityBadge.vue'
import { getPhotoUrl } from '../../utils/photos'

/**
 * Folders or albums as cards with their cover. With `ordering`, the admin
 * drags the cards (or uses their arrows) into an order instead of opening
 * them, and the new order comes out as `update:items`.
 */
export default {
  name: 'CardGrid',
  components: {
    ChevronLeftIcon,
    ChevronRightIcon,
    FolderIcon,
    PhotographIcon,
    VisibilityBadge
  },
  props: {
    items: { type: Array, required: true },
    type: { type: String, default: 'folder' },
    ordering: { type: Boolean, default: false }
  },
  emits: ['update:items'],
  data: () => ({
    moment,
    BUTTON:
      'rounded-full bg-white bg-opacity-90 p-1 text-gray-700 shadow hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:invisible',
    dragged: null,
    over: null
  }),
  methods: {
    getPhotoUrl,
    /* A list can mix folders and albums when each item says its kind. */
    kindOf(item) {
      return item.kind || this.type
    },
    move(from, to) {
      const items = [...this.items]
      items.splice(to, 0, ...items.splice(from, 1))
      this.$emit('update:items', items)
    },
    dragStart(index, event) {
      this.dragged = index
      event.dataTransfer.effectAllowed = 'move'
      /* Firefox only drags with data. */
      event.dataTransfer.setData('text/plain', this.items[index]._id)
    },
    drop(index) {
      /* Cards of the other list are not moved over. */
      if (this.dragged === null) return
      if (this.dragged != index) this.move(this.dragged, index)
      this.dragged = this.over = null
    }
  }
}
</script>
