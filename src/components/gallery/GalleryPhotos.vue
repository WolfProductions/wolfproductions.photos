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
        :data-pswp-width="photo.width"
        :data-pswp-height="photo.height"
        :data-original="photo.original"
        data-cropped="true"
      >
        <img
          class="aspect-[3/2] h-auto w-full cursor-pointer object-cover opacity-0 transition-opacity duration-200 ease-in-out"
          @load="fadeIn"
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

import { getPhotoUrl, getOriginalUrl } from '../../utils/photos'

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
    lightbox: null,
    photos: []
  }),
  async mounted() {
    this.setColumns()

    this.lightbox = new PhotoSwipeLightbox({
      gallery: '#gallery',
      children: 'a',
      showHideAnimationType: 'zoom',
      pswpModule: () => import('photoswipe')
    })

    // A button in the toolbar that downloads the original of the current photo
    this.lightbox.on('uiRegister', () => {
      this.lightbox.pswp.ui.registerElement({
        name: 'download-button',
        order: 8,
        isButton: true,
        tagName: 'a',
        title: 'Download original',
        html: {
          isCustomSVG: true,
          inner:
            '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
          outlineID: 'pswp__icn-download'
        },
        onInit: (el, pswp) => {
          el.setAttribute('download', '')
          el.setAttribute('target', '_blank')
          el.setAttribute('rel', 'noopener')

          pswp.on('change', () => {
            el.href = pswp.currSlide.data.element.dataset.original
          })
        }
      })
    })

    this.lightbox.init()

    window.addEventListener('resize', this.setColumns)

    this.getPhotos()
  },
  unmounted() {
    this.lightbox.destroy()
    this.lightbox = null
    window.removeEventListener('resize', this.setColumns)
  },
  computed: {
    favorites() {
      return this.album?.sections?.find((section) => section.title == 'Highlights')?.photos || []
    }
  },
  methods: {
    getPhotos() {
      const section = this.album?.sections?.find((section) => section.active)
      const favorites = this.album?.sections?.find((section) => section.title == 'Highlights')
      const meta = this.album?.photoMeta || {}

      // A photo shows up once its variants have been made
      this.photos = (section?.photos || [])
        .filter((photo) => meta[photo]?.status == 'ready')
        .map((photo) => {
          return {
            key: photo,
            src: getPhotoUrl(photo, 'large'),
            thumbnail: getPhotoUrl(photo, 'thumb'),
            original: getOriginalUrl(photo),
            width: meta[photo].width,
            height: meta[photo].height,
            favorite: favorites?.photos.find((p) => p == photo.key) ? true : false
          }
        })
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
    fadeIn(event) {
      event.target.style.opacity = 1
    },
    switchFavorite(photo) {
      this.$emit('switchFavorite', photo)
    }
  },
  watch: {
    album: {
      handler() {
        this.getPhotos()
      },
      deep: true
    }
  }
}
</script>
