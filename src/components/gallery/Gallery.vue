<template>
  <NotFound v-if="missing" />
  <div v-else class="relative">
    <GalleryHeader v-if="hasCover" :album="album" />
    <!-- Without a cover the photos start right below a plain top bar; the
         wrapper keeps the bar from sticking, so only the menu does -->
    <div v-else-if="album._id">
      <TopBar
        :logo="album.logo"
        :breadcrumb="album.breadcrumb"
        :current="album.title"
      />
    </div>
    <GalleryMenu :album="album" />
    <p
      v-if="album.photoStats?.pending"
      class="mx-3 mb-3 text-sm font-light text-gray-500 md:mx-7"
    >
      Processing photos… {{ album.photoStats.ready }} /
      {{ album.photoStats.total }}
    </p>
    <GalleryPhotos :album="album" :set-cover="setCover" />
  </div>
</template>

<script>
import GalleryHeader from './GalleryHeader.vue'
import GalleryMenu from './GalleryMenu.vue'
import GalleryPhotos from './GalleryPhotos.vue'

import TopBar from '../layout/TopBar.vue'
import NotFound from '../../views/NotFound.vue'

import api from '../../api'
import moment from 'moment'

export default {
  name: 'Page',
  components: {
    GalleryHeader,
    GalleryMenu,
    GalleryPhotos,
    TopBar,
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
  computed: {
    /* A cover that can be shown: set, and its variants made (not pending or failed). */
    hasCover() {
      const cover = this.album.cover
      if (!cover) return false
      const status = this.album.photoMeta?.[cover]?.status
      return !status || status == 'ready'
    }
  },
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
    async setCover(ref) {
      const response = await api.put(
        `/albums/${this.$route.params.album_id}/cover`,
        { ref }
      )
      this.album.cover = response.data.cover
    },
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
