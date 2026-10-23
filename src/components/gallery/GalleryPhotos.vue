<template>
  <!-- Photos grid -->
  <div
    class="mx-2 mb-6 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:mx-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    id="gallery"
  >
    <div class="group relative" v-for="photo of photos" :key="photo.ref">
      <a
        :href="photo.src"
        target="_blank"
        rel="noopener noreferrer"
        :data-pswp-width="photo.width"
        :data-pswp-height="photo.height"
        :data-ref="photo.ref"
        data-cropped="true"
      >
        <img
          class="aspect-[3/2] h-auto w-full cursor-pointer object-cover opacity-0 transition-opacity duration-200 ease-in-out"
          @load="fadeIn"
          :src="photo.thumbnail"
          loading="lazy"
        />
      </a>
    </div>
  </div>
</template>

<script>
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

import { DOWNLOAD_SIZES, downloadPhoto, getPhotoUrl } from '../../utils/photos'
import { session } from '../../session'

export default {
  name: 'GalleryPhotos',
  props: {
    /* The album, or a stand-in with one section; canDownload says whether the viewer may download. */
    album: {
      type: Object,
      required: true
    },
    /* Makes a photo (by ref) the cover; without it there is no cover button. */
    setCover: {
      type: Function,
      default: null
    }
  },
  data: () => ({
    session,
    lightbox: null,
    photos: []
  }),
  async mounted() {
    this.lightbox = new PhotoSwipeLightbox({
      gallery: '#gallery',
      children: 'a',
      showHideAnimationType: 'zoom',
      pswpModule: () => import('photoswipe')
    })

    // For the admin, a button in the toolbar that makes the photo on screen the cover
    // (of the album, or of the folder for loose photos)
    this.lightbox.on('uiRegister', () => {
      if (!this.setCover || !this.session.admin) return
      this.lightbox.pswp.ui.registerElement({
        name: 'cover-button',
        order: 7,
        isButton: true,
        title: 'Set as cover',
        html: {
          isCustomSVG: true,
          inner:
            '<path d="M16 8l2 5.25 5.6.25-4.4 3.5 1.5 5.5-4.7-3.1-4.7 3.1 1.5-5.5-4.4-3.5 5.6-.25Z" id="pswp__icn-cover"/>',
          outlineID: 'pswp__icn-cover'
        },
        onInit: (el, pswp) => {
          const ref = () => pswp.currSlide?.data.element?.dataset.ref
          // Coloured while the photo on screen is the cover
          const update = () => {
            const isCover = ref() && ref() == this.album.cover
            el.style.setProperty('--pswp-icon-color', isCover ? '#f43f5e' : '')
            el.title = isCover ? 'Cover' : 'Set as cover'
          }
          pswp.on('change', update)
          el.addEventListener('click', async () => {
            try {
              await this.setCover(ref())
              await this.$nextTick()
              update()
            } catch (e) {
              window.alert('The cover could not be changed.')
            }
          })
        }
      })
    })

    // A button in the toolbar with a menu of the sizes to download, when the viewer may
    this.lightbox.on('uiRegister', () => {
      if (!this.album.canDownload) return
      this.lightbox.pswp.ui.registerElement({
        name: 'download-button',
        order: 8,
        isButton: true,
        title: 'Download',
        html: {
          isCustomSVG: true,
          inner:
            '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
          outlineID: 'pswp__icn-download'
        },
        onInit: (el, pswp) => {
          const menu = this.downloadMenu(pswp)
          pswp.element.appendChild(menu)
          el.addEventListener('click', () => menu.classList.toggle('hidden'))
          pswp.on('change', () => menu.classList.add('hidden'))
        }
      })
    })

    this.lightbox.init()
    this.getPhotos()
  },
  unmounted() {
    this.lightbox.destroy()
    this.lightbox = null
  },
  methods: {
    getPhotos() {
      const section = this.album?.sections?.find((section) => section.active)
      const meta = this.album?.photoMeta || {}

      // A photo shows up once its variants have been made
      this.photos = (section?.photos || [])
        .filter((ref) => meta[ref]?.status == 'ready')
        .map((ref) => ({
          ref,
          src: getPhotoUrl(ref, 'large'),
          thumbnail: getPhotoUrl(ref, 'thumb'),
          width: meta[ref].width,
          height: meta[ref].height
        }))
    },
    /* The menu under the download button: one entry per size, for the photo on screen. */
    downloadMenu(pswp) {
      const menu = document.createElement('div')
      menu.className =
        'hidden absolute right-4 top-14 z-[100000] flex flex-col overflow-hidden rounded-md bg-white text-sm text-gray-800 shadow-lg'

      for (const { size, label } of DOWNLOAD_SIZES) {
        const item = document.createElement('button')
        item.type = 'button'
        item.className = 'px-4 py-2 text-left hover:bg-gray-100'
        item.textContent = label
        item.addEventListener('click', async () => {
          const ref = pswp.currSlide.data.element.dataset.ref
          item.textContent = 'Downloading…'
          try {
            await downloadPhoto(ref, size)
            menu.classList.add('hidden')
          } catch (e) {
            window.alert(
              e.response?.status == 503
                ? 'The original is not available right now.'
                : 'The photo could not be downloaded.'
            )
          } finally {
            item.textContent = label
          }
        })
        menu.appendChild(item)
      }
      return menu
    },
    fadeIn(event) {
      event.target.style.opacity = 1
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
