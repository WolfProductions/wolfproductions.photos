<template>
  <div
    id="photos"
    class="sticky top-0 flex w-full flex-col space-y-2 bg-white py-3 px-3 md:flex-row md:space-y-0 md:px-7 z-10"
  >
    <!-- Title section -->
    <div class="flex justify-between">
      <div class="mr-12 flex flex-col justify-center">
        <h1 class="min-w-max text-xl font-semibold leading-tight">
          {{ album?.title }}
        </h1>
        <p class="text-base font-light">
          {{album?.date }}
        </p>
      </div>

      <div class="flex md:hidden items-center space-x-4 ml-auto">
        <router-link :to="`/${$route.params.organisation_id}/${$route.params.album_id}/edit`">
          <PencilIcon class="w-5 h-5 text-gray-700 m-2" />
        </router-link>
      </div>
    </div>

    <!-- Gallery section -->
    <div class="flex items-center overflow-x-auto pb-1.5 md:space-x-4 md:pb-0">
      <span
        @click="album?.sections.forEach(s => s.active = false); section.active = true"
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
    <div class="hidden md:flex items-center space-x-4 ml-auto">
      <router-link :to="`/${$route.params.organisation_id}/${$route.params.album_id}/edit`">
        <PencilIcon class="w-5 h-5 text-gray-700 m-2" />
      </router-link>
    </div>
  </div>
</template>

<script>
import { PencilIcon } from '@heroicons/vue/outline'

export default {
  name: 'GalleryMenu',
  components: { PencilIcon },
  props: {
    album: {
      type: Object,
      required: true
    }
  }
}
</script>
