<template>
  <div class="relative">
    <GalleryHeader :album="album" />
    <GalleryMenu :album="album" />
    <GalleryPhotos :album="album" @switchFavorite="switchFavorite" />
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
    album: {
      title: '',
      date: '',
      cover: '',
      sections: [],
      originalDate: ''
    },
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
        this.album.originalDate = this.album.date
        this.album.date = this.moment(this.album.date).fromNow()
      })
  },
  methods: {
    switchFavorite(photo) {
      const section = this.album?.sections?.find(
        (section) => section.title == 'Highlights'
      )
      if (!section) {
        this.album.sections = [
          {
            title: 'Highlights',
            photos: [photo.key],
            active: false
          },
          ...this.album?.sections
        ]
      } else {
        const index = section.photos.indexOf(photo.key)
        if (index > -1) {
          section.photos.splice(index, 1)
        } else {
          section.photos.push(photo.key)
        }

        if (section.photos.length == 0) {
          this.album.sections = this.album.sections.filter(
            (section) => section.title != 'Highlights'
          )
        }
      }

      axios.put(
        `https://wolfproductions.photos/api/album/${this.$route.params.album_id}`,
        {
          _id: this.album._id,
          title: this.album.title,
          date: this.album.originalDate,
          cover: this.album.cover,
          sections: this.album.sections,
          organisation: this.album.organisation
        }
      )
    }
  }
}
</script>
