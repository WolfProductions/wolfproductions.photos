<template>
  <ul
    role="list"
    class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8"
  >
    <li v-for="item in items" :key="item._id" class="relative">
      <div
        class="group aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-rose-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <img
          v-if="item.cover"
          :src="getPhotoUrl(item.cover, 'medium')"
          alt=""
          class="pointer-events-none object-cover group-hover:opacity-75"
        />
        <div
          v-else
          class="pointer-events-none flex items-center justify-center text-gray-300"
        >
          <FolderIcon v-if="kindOf(item) == 'folder'" class="h-12 w-12" />
          <PhotographIcon v-else class="h-12 w-12" />
        </div>
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
import { FolderIcon, PhotographIcon } from '@heroicons/vue/solid'

import VisibilityBadge from './VisibilityBadge.vue'
import { getPhotoUrl } from '../../utils/photos'

/* Folders or albums as cards with their cover. */
export default {
  name: 'CardGrid',
  components: { FolderIcon, PhotographIcon, VisibilityBadge },
  props: {
    items: { type: Array, required: true },
    type: { type: String, default: 'folder' }
  },
  data: () => ({ moment }),
  methods: {
    getPhotoUrl,
    /* A list can mix folders and albums when each item says its kind. */
    kindOf(item) {
      return item.kind || this.type
    }
  }
}
</script>
