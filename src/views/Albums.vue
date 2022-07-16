<template>
  <!--
    This example requires updating your template:

    ```
    <html class="h-full bg-white">
    <body class="h-full">
    ```
  -->
  <div class="flex min-h-full">
    <div class="flex w-0 flex-1 flex-col">
      <div
        class="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white"
      >
        <div
          class="flex items-center justify-center border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900"
        >
          <img :src="getPhotoUrl(organisation?.logo)" class="h-10 w-auto" />
        </div>
        <div class="flex flex-1 justify-between px-4">
          <div class="flex flex-1">
            <form class="flex w-full lg:ml-0" action="#" method="GET">
              <label for="search-field" class="sr-only">Search</label>
              <div
                class="relative w-full text-gray-400 focus-within:text-gray-600"
              >
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center"
                >
                  <SearchIcon class="h-5 w-5" aria-hidden="true" />
                </div>
                <input
                  id="search-field"
                  class="block h-full w-full border-transparent py-2 pl-8 pr-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
                  placeholder="Search"
                  type="search"
                  name="search"
                />
              </div>
            </form>
          </div>
          <div class="ml-4 flex items-center lg:ml-6">
            <router-link
              :to="`/${organisation?._id}/create`"
              type="button"
              class="inline-flex items-center rounded-md border border-transparent bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Create
            </router-link>
          </div>
        </div>
      </div>

      <main class="flex-1">
        <div class="py-8 xl:py-10">
          <div class="mx-auto px-4 sm:px-6 lg:px-8">
            <AlbumsList />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

import { MenuAlt2Icon, XIcon } from '@heroicons/vue/outline'
import { SearchIcon } from '@heroicons/vue/solid'

import AlbumsList from '../components/albums/AlbumsList.vue'
import Logo from '../assets/white_text.svg'

export default {
  name: 'Albums',
  components: {
    SearchIcon,
    XIcon,
    MenuAlt2Icon,
    AlbumsList
  },
  data: () => ({
    organisation: null
  }),
  setup() {
    return {
      Logo
    }
  },
  mounted() {
    // Get the organisation
    axios
      .get(
        `https://wolfproductions.photos/api/organisations/${this.$route.params.organisation_id}`
      )
      .then((response) => {
        this.organisation = response.data
      })
  },
  methods: {
    getPhotoUrl(key) {
      if (!key) return ''

      const bucketName = 'wolfproductions.photos'
      const bucketUrl = 'https://s3.eu-west-1.amazonaws.com/' + bucketName + '/'

      return bucketUrl + key
    }
  }
}
</script>
