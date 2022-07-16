<template>
  <div class="relative h-screen w-full overflow-hidden">
    <img
      class="h-full w-full object-cover"
      :src="getPhotoUrl(album?.cover, 2000)"
      alt="Background image gallery cover"
    />

    <!-- logo -->
    <router-link :to="`/${organisation?._id}`">
      <img
        class="absolute top-8 left-8 h-8 w-auto"
        :src="getPhotoUrl(organisation?.logo)"
        alt="logo"
      />
    </router-link>

    <!-- Information about gallery -->
    <div
      class="absolute bottom-8 flex w-full flex-col justify-between px-8 sm:bottom-16 sm:flex-row sm:items-end sm:px-16"
    >
      <div class="mb-4 flex flex-col space-y-2 text-white sm:mb-0 sm:space-y-4">
        <!-- Gallery title -->
        <h1 class="text-4xl font-bold leading-tight sm:text-7xl">
          {{ album?.title }}
        </h1>
        <!-- Date -->
        <p class="text-xl">
          {{ album?.date }}
        </p>
      </div>
      <div>
        <!-- Scroll down button -->
        <a
          href="#photos"
          type="button"
          class="inline-flex min-w-max items-center rounded border border-white bg-transparent px-4 py-2 text-base font-medium text-white focus:outline-none"
        >
          Show gallery
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Logo from '../../assets/white_text_bg.svg'

export default {
  name: 'GalleryHeader',
  props: {
    album: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    Logo,
    organisation: null
  }),
  mounted() {
    // Get the organisation
    axios
      .get(
        `https://wolfproductions.photos/api/organisations/${this.$route.params.organisation_id}`
      )
      .then((reponse) => {
        this.organisation = reponse.data
      })
  },
  methods: {
    getPhotoUrl(key, width) {
      if (!key) return ''

      const bucketName = 'wolfproductions.photos'
      const CloudFrontUrl = 'https://d1b892w88fzt8v.cloudfront.net'

      const imageRequest = JSON.stringify({
        bucket: bucketName,
        key: key,
        edits: {
          resize: {
            width: width || 300
          }
        }
      })

      return `${CloudFrontUrl}/${btoa(imageRequest)}`
    }
  }
}
</script>
