<template>
  <ul
    role="list"
    class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-8"
  >
    <li v-for="album in albums" :key="album" class="relative">
      <div
        class="group aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <img
          v-if="album.cover"
          :src="getPhotoUrl(album.cover)"
          alt=""
          class="pointer-events-none object-cover group-hover:opacity-75"
        />
        <router-link
          :to="$route.path + '/' + album._id"
          type="button"
          class="absolute inset-0 focus:outline-none"
        >
          <span class="sr-only">View details for {{ album.title }}</span>
        </router-link>
      </div>
      <div class="flex justify-between">
        <div class="truncate">
          <p
            class="pointer-events-none mt-2 block truncate text-sm font-medium text-gray-900"
          >
            {{ album.title }}
          </p>
          <p
            class="pointer-events-none block text-sm font-medium text-gray-500"
          >
            {{ moment(album.date).fromNow() }}
          </p>
        </div>
        <div class="ml-auto flex items-center space-x-4">
          <router-link
            :to="`/${$route.params.organisation_id}/${album._id}/edit`"
          >
            <PencilIcon class="m-2 h-4 lg:h-5 w-4 lg:w-5 text-gray-700" />
          </router-link>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
import axios from 'axios'
import moment from 'moment'

import { PencilIcon } from '@heroicons/vue/outline'

export default {
  name: 'AlbumsList',
  components: { PencilIcon },
  data() {
    return {
      s3Client: null,
      albums: [],
      moment
    }
  },
  async mounted() {
    // Get the list of albums
    axios
      .get(
        `https://wolfproductions.photos/api/organisations/${this.$route.params.organisation_id}/albums`
      )
      .then((response) => {
        if (!response.data || response.data.length == 0) return

        this.albums = response.data.sort((a, b) => {
          return moment(b.date).diff(moment(a.date))
        })
      })
  },
  methods: {
    getPhotoUrl(key, width) {
      const bucketName = 'wolfproductions.photos'
      const CloudFrontUrl = 'https://d1b892w88fzt8v.cloudfront.net'

      const imageRequest = JSON.stringify({
        bucket: bucketName,
        key: key,
        edits: {
          resize: {
            width: width || 800
          }
        }
      })

      return `${CloudFrontUrl}/${btoa(imageRequest)}`
    }
  }
}
</script>
