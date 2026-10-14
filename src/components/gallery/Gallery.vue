<template>
  <NotFound v-if="missing" />
  <div v-else class="relative">
    <GalleryHeader :album="album" />
    <GalleryMenu :album="album" />
    <p
      v-if="album.photoStats?.pending"
      class="mx-3 mb-3 text-sm font-light text-gray-500 md:mx-7"
    >
      Processing photos… {{ album.photoStats.ready }} /
      {{ album.photoStats.total }}
    </p>
    <GalleryPhotos :album="album" />
  </div>
</template>

<script>
import GalleryHeader from './GalleryHeader.vue'
import GalleryMenu from './GalleryMenu.vue'
import GalleryPhotos from './GalleryPhotos.vue'

import NotFound from '../../views/NotFound.vue'

import api from '../../api'
import moment from 'moment'

export default {
  name: 'Page',
  components: {
    GalleryHeader,
    GalleryMenu,
    GalleryPhotos,
    NotFound
  },
  data: () => ({
    album: {
      title: '',
      date: '',
      cover: '',
      sections: [],
      originalDate: ''
    },
    moment,
    missing: false,
    polls: 0,
    pollTimer: null
  }),
  mounted() {
    api
      .get(`/albums/${this.$route.params.album_id}`)
      .then((reponse) => {
        this.album = reponse.data
        this.album.sections.forEach((section) => {
          section.active = false
        })
        if (this.album.sections.length) this.album.sections[0].active = true
        this.album.originalDate = this.album.date
        this.album.date = this.album.date
          ? this.moment(this.album.date).fromNow()
          : ''
        this.pollProgress()
      })
      .catch((e) => {
        if (e.response?.status == 404) this.missing = true
      })
  },
  unmounted() {
    clearTimeout(this.pollTimer)
    this.pollTimer = null
  },
  methods: {
    // While photos are still being processed, refresh only their status, so
    // the section the visitor picked stays as it is
    pollProgress() {
      if (!this.album.photoStats?.pending || this.polls++ > 600) return

      this.pollTimer = setTimeout(async () => {
        try {
          const response = await api.get(
            `/albums/${this.$route.params.album_id}`
          )
          this.album.photoMeta = response.data.photoMeta
          this.album.photoStats = response.data.photoStats
        } catch (e) {
          // Try again on the next round
        }
        if (this.pollTimer) this.pollProgress()
      }, 3000)
    }
  }
}
</script>
