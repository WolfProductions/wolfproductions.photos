<template>
  <div class="flex min-h-full flex-col">
    <TopBar>
      <AdminButton to="/portfolio/edit" primary>Edit homepage</AdminButton>
    </TopBar>

    <div
      v-if="portfolio.hero"
      class="relative h-[70vh] w-full overflow-hidden bg-gray-900"
    >
      <img
        :src="getPhotoUrl(portfolio.hero, 'large')"
        class="h-full w-full object-cover opacity-90"
        alt=""
      />
      <div
        class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-10 pt-24 sm:px-8 lg:px-16"
      >
        <h1 class="text-4xl font-bold text-white sm:text-6xl">
          {{ portfolio.title }}
        </h1>
      </div>
    </div>

    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto space-y-12 px-4 sm:px-6 lg:px-8">
        <div v-if="!portfolio.hero && portfolio.title">
          <h1 class="text-3xl font-bold text-gray-900">
            {{ portfolio.title }}
          </h1>
        </div>
        <p
          v-if="portfolio.intro"
          class="max-w-3xl whitespace-pre-line text-lg text-gray-700"
        >
          {{ portfolio.intro }}
        </p>

        <SharedWithYou />

        <section v-if="portfolio.photos.length">
          <div class="-mx-2 md:-mx-6">
            <GalleryPhotos :album="photoAlbum" />
          </div>
        </section>

        <section v-if="portfolio.featured.length">
          <h2 class="mb-4 text-lg font-medium text-gray-900">Featured</h2>
          <CardGrid :items="portfolio.featured" />
        </section>

        <p class="text-center">
          <router-link
            to="/folders"
            class="text-sm font-medium text-rose-600 hover:text-rose-500"
            >See all folders</router-link
          >
        </p>
      </div>
    </main>
  </div>
</template>

<script>
import { getPhotoUrl } from '../utils/photos'

import AdminButton from '../components/layout/AdminButton.vue'
import CardGrid from '../components/folders/CardGrid.vue'
import GalleryPhotos from '../components/gallery/GalleryPhotos.vue'
import SharedWithYou from '../components/shares/SharedWithYou.vue'
import TopBar from '../components/layout/TopBar.vue'

/* The portfolio: a hero photo, an intro, a selection of photos and featured public folders and albums. */
export default {
  name: 'Portfolio',
  components: { AdminButton, CardGrid, GalleryPhotos, SharedWithYou, TopBar },
  props: {
    portfolio: { type: Object, required: true }
  },
  computed: {
    /* The photos in the shape the gallery grid takes; the portfolio offers no downloads. */
    photoAlbum() {
      return {
        sections: [{ title: '', photos: this.portfolio.photos, active: true }],
        photoMeta: this.portfolio.photoMeta,
        canDownload: false
      }
    }
  },
  methods: { getPhotoUrl }
}
</script>
