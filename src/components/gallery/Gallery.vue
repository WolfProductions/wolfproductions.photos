<template>
  <div class="relative">
    <GalleryHeader :album="album" />
    <GalleryMenu :album="album" />
    <GalleryPhotos :album="album" />
  </div>
</template>

<script>
import GalleryHeader from './GalleryHeader.vue'
import GalleryMenu from './GalleryMenu.vue'
import GalleryPhotos from './GalleryPhotos.vue'

import axios from 'axios'
import moment from 'moment'

export default {
  name: 'Page',
  components: {
    GalleryHeader,
    GalleryMenu,
    GalleryPhotos
  },
  data: () => ({
    album: {},
    moment
  }),
  mounted() {
    axios
      .get(
        `https://wolfproductions.photos/api/album/${this.$route.params.album_id}`
      )
      .then((reponse) => {
        this.album = reponse.data
        this.album.sections.forEach((section) => {
          section.active = false
        })
        this.album.sections[0].active = true
        this.album.date = this.moment(this.album.date).fromNow()
      })
  }
}
</script>
