<template>
  <div
    id="photos"
    class="sticky top-0 z-10 flex w-full flex-col space-y-2 bg-white py-3 px-3 md:flex-row md:space-y-0 md:px-7"
  >
    <!-- Title section -->
    <div class="flex justify-between">
      <div class="mr-12 flex flex-col justify-center">
        <h1 class="min-w-max text-xl font-semibold leading-tight">
          {{ album?.title }}
        </h1>
        <p class="text-base font-light">
          {{ album?.date }}
        </p>
      </div>

      <div
        v-if="session.admin"
        class="ml-auto flex items-center space-x-4 md:hidden"
      >
        <button type="button" @click="sharing = true">
          <ShareIcon class="m-2 h-5 w-5 text-gray-700" />
          <span class="sr-only">Share</span>
        </button>
        <router-link :to="`/a/${$route.params.album_id}/edit`">
          <PencilIcon class="m-2 h-5 w-5 text-gray-700" />
        </router-link>
      </div>
    </div>

    <!-- Gallery section -->
    <div class="flex items-center overflow-x-auto pb-1.5 md:space-x-4 md:pb-0">
      <span
        @click="selectSection(section)"
        :class="[
          section.active
            ? 'border-b border-gray-800 font-normal text-gray-900 md:border-b-0'
            : 'text-gray-400',
          'md:py- min-w-max cursor-pointer px-4 py-1 text-sm font-light hover:text-gray-700'
        ]"
        v-for="section in album?.sections"
        :key="section"
        >{{ section.title }}</span
      >
    </div>

    <!-- Buttons -->
    <div
      v-if="session.admin"
      class="ml-auto hidden items-center space-x-4 md:flex"
    >
      <VisibilityBadge
        :visibility="album.effectiveVisibility"
        :inherited="album.visibility == 'inherit'"
      />
      <button type="button" @click="sharing = true">
        <ShareIcon class="m-2 h-5 w-5 text-gray-700" />
        <span class="sr-only">Share</span>
      </button>
      <router-link :to="`/a/${$route.params.album_id}/edit`">
        <PencilIcon class="m-2 h-5 w-5 text-gray-700" />
      </router-link>
    </div>

    <ShareDialog
      v-if="session.admin && album._id"
      :open="sharing"
      :target="{ kind: 'album', id: album._id, title: album.title }"
      @close="sharing = false"
    />
  </div>
</template>

<script>
import { PencilIcon, ShareIcon } from '@heroicons/vue/outline'

import ShareDialog from '../shares/ShareDialog.vue'
import VisibilityBadge from '../folders/VisibilityBadge.vue'
import { session } from '../../session'

export default {
  name: 'GalleryMenu',
  components: { PencilIcon, ShareDialog, ShareIcon, VisibilityBadge },
  data: () => ({ session, sharing: false }),
  props: {
    album: {
      type: Object,
      required: true
    }
  },
  methods: {
    selectSection(section) {
      this.album.sections.forEach((s) => (s.active = false))
      section.active = true
      this.resetScroll()
    },
    resetScroll() {
      const menu = document.getElementById('photos')
      const photos = document.getElementById('gallery')
      const top = photos.offsetTop

      window.scrollTo({
        top: top - menu.clientHeight,
        behavior: 'smooth'
      })
    }
  }
}
</script>
