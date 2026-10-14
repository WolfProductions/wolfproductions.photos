<template>
  <div class="relative h-screen w-full overflow-hidden">
    <img
      class="h-full w-full object-cover"
      :src="getPhotoUrl(album?.cover, 'large')"
      alt="Background image gallery cover"
    />

    <!-- logo -->
    <router-link :to="backTo" class="absolute top-8 left-8">
      <img
        class="h-8 w-auto max-w-[12rem] object-contain"
        :src="album?.logo ? getPhotoUrl(album.logo) : Logo"
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
import { getPhotoUrl } from '../../utils/photos'
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
    Logo
  }),
  computed: {
    /* The logo leads back to the folder the album is in, as far as the visitor may see. */
    backTo() {
      const breadcrumb = this.album?.breadcrumb || []
      return breadcrumb.length
        ? `/f/${breadcrumb[breadcrumb.length - 1]._id}`
        : '/'
    }
  },
  methods: {
    getPhotoUrl
  }
}
</script>
