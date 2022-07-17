<template>
  <!-- Photos grid -->
  <div
    class="mx-2 mb-6 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:mx-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    id="gallery"
  >
    <!-- <div v-for="c in columns" :key="c" class="flex flex-col space-y-1.5"> -->
    <div class="group relative" v-for="photo of photos" :key="photo.key">
      <a
        :key="photo.key"
        :href="photo.src"
        target="_blank"
        rel="noopener noreferrer"
        :data-pswp-width="1920"
        :data-pswp-height="photo.height"
      >
        <img
          class="aspect-[3/2] h-auto w-full cursor-pointer object-cover opacity-0 transition-opacity duration-200 ease-in-out"
          @load="setDimensions"
          :src="photo.thumbnail"
          loading="lazy"
        />
      </a>
      <!-- <div
        class="absolute h-1/2 bottom-0 left-0 right-0 z-10 flex items-end justify-end from-transparent via-transparent to-black group-hover:bg-gradient-to-b"
      >
        <HeartSolidIcon
          v-if="favorites.includes(photo.key)"
          @click="switchFavorite(photo)"
          class="m-2 hidden h-6 w-6 text-white group-hover:block cursor-pointer"
        />
        <HeartIcon
          v-else
          @click="switchFavorite(photo)"
          class="m-2 hidden h-6 w-6 text-white group-hover:block cursor-pointer"
        />
      </div> -->
    </div>
    <!-- </div> -->
  </div>
</template>

<script>
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

import { HeartIcon } from '@heroicons/vue/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/vue/solid'

export default {
  name: 'GalleryPhotos',
  components: { HeartIcon, HeartSolidIcon },
  props: {
    album: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    columns: 2,
    lightbox: null
  }),
  mounted() {
    this.setColumns()

    this.lightbox = new PhotoSwipeLightbox({
      gallery: '#gallery',
      children: 'div',
      showHideAnimationType: 'zoom',
      pswpModule: () => import('photoswipe')
    })

    this.lightbox.init()

    window.addEventListener('resize', this.setColumns)
  },
  unmounted() {
    this.lightbox.destroy()
    this.lightbox = null
    window.removeEventListener('resize', this.setColumns)
  },
  computed: {
    photos() {
      const section = this.album?.sections?.find((section) => section.active)
      const favorites = this.album?.sections?.find((section) => section.title == 'Highlights')

      return section?.photos.sort((a, b) => b - a).map((photo) => {
        return {
          key: photo,
          src: this.getPhotoUrl(photo, 1920),
          thumbnail: this.getPhotoUrl(photo, 320),
          width: 1000,
          height: 1000,
          favorite: favorites?.photos.find((p) => p == photo.key) ? true : false
        }
      })
    },
    favorites() {
      return this.album?.sections?.find((section) => section.title == 'Highlights')?.photos || []
    }
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
    },
    setColumns() {
      const width = document.documentElement.clientWidth
      let columns = 6

      if (width < 640) columns = 2
      else if (width < 768) columns = 3
      else if (width < 1024) columns = 4
      else if (width < 1280) columns = 5
      else columns = 6

      this.columns = columns
    },
    createChunks(arr, chunkSize) {
      if (!arr) return

      const chunks = []
      for (let i = 0; i < arr.length; i += chunkSize) {
        chunks.push(arr.slice(i, i + chunkSize))
      }
      return chunks
    },
    transpose(matrix) {
      if (!matrix) return []

      let [row] = matrix
      return row.map((value, column) => matrix.map((row) => row[column]))
    },
    setDimensions() {
      event.path[0].style.opacity = 1

      const width = event.path[0].naturalWidth
      const height = event.path[0].naturalHeight
      const ratio = width / height

      const newWidth = 1920
      const newHeight = newWidth / ratio

      event.path[1].dataset.pswpWidth = newWidth
      event.path[1].dataset.pswpHeight = newHeight
    },
    switchFavorite(photo) {
      this.$emit('switchFavorite', photo)
    }
  }
}
</script>
