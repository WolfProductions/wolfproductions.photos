<template>
  <NotFound v-if="missing" />
  <div v-else class="flex min-h-full flex-col">
    <TopBar
      :logo="folder?.logo"
      :breadcrumb="folder?.breadcrumb"
      :current="folder?.title"
    >
      <template v-if="folder">
        <VisibilityBadge
          :visibility="folder.effectiveVisibility"
          :inherited="folder.visibility == 'inherit'"
        />
        <button
          type="button"
          class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          @click="sharing = true"
        >
          Share
        </button>
        <AdminButton :to="`/f/${folder._id}/edit`">Edit</AdminButton>
        <AdminButton :to="{ path: '/f/new', query: { parent: folder._id } }"
          >New folder</AdminButton
        >
        <AdminButton
          :to="{ path: '/a/new', query: { folder: folder._id } }"
          primary
          >New album</AdminButton
        >
      </template>
    </TopBar>

    <div
      v-if="folder?.cover"
      class="relative h-48 w-full overflow-hidden bg-gray-900 sm:h-72"
    >
      <img
        :src="getPhotoUrl(folder.cover, 'large')"
        class="h-full w-full object-cover opacity-80"
        alt=""
      />
      <div class="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-white sm:text-5xl">
          {{ folder.title }}
        </h1>
      </div>
    </div>

    <main v-if="folder" class="flex-1 py-8 xl:py-10">
      <div class="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
        <h1 v-if="!folder.cover" class="text-2xl font-bold text-gray-900">
          {{ folder.title }}
        </h1>
        <p v-if="folder.description" class="max-w-3xl text-gray-600">
          {{ folder.description }}
        </p>

        <CardGrid
          v-if="folder.folders.length"
          :items="folder.folders"
          type="folder"
        />
        <CardGrid
          v-if="folder.albums.length"
          :items="folder.albums"
          type="album"
        />

        <section v-if="folder.photos.length">
          <p
            v-if="folder.photoStats?.pending"
            class="mb-3 text-sm font-light text-gray-500"
          >
            Processing photos… {{ folder.photoStats.ready }} /
            {{ folder.photoStats.total }}
          </p>
          <div class="-mx-2 md:-mx-6">
            <GalleryPhotos :album="looseAlbum" :set-cover="setCover" />
          </div>
        </section>

        <p v-if="empty" class="py-16 text-center text-sm text-gray-500">
          This folder is empty.
        </p>
      </div>
    </main>

    <ShareDialog
      v-if="folder && session.admin"
      :open="sharing"
      :target="{ kind: 'folder', id: folder._id, title: folder.title }"
      @close="sharing = false"
    />
  </div>
</template>

<script>
import api from '../api'
import { session } from '../session'
import { getPhotoUrl } from '../utils/photos'

import AdminButton from '../components/layout/AdminButton.vue'
import CardGrid from '../components/folders/CardGrid.vue'
import GalleryPhotos from '../components/gallery/GalleryPhotos.vue'
import NotFound from './NotFound.vue'
import ShareDialog from '../components/shares/ShareDialog.vue'
import TopBar from '../components/layout/TopBar.vue'
import VisibilityBadge from '../components/folders/VisibilityBadge.vue'

/* A folder: its subfolders, its albums and the photos that sit loose in it. */
export default {
  name: 'Folder',
  components: {
    AdminButton,
    CardGrid,
    GalleryPhotos,
    NotFound,
    ShareDialog,
    TopBar,
    VisibilityBadge
  },
  data: () => ({
    folder: null,
    missing: false,
    session,
    sharing: false,
    pollTimer: null
  }),
  computed: {
    empty() {
      const { folders, albums, photos } = this.folder
      return !folders.length && !albums.length && !photos.length
    },
    /* The loose photos in the shape the gallery grid takes. */
    looseAlbum() {
      return {
        sections: [{ title: '', photos: this.folder.photos, active: true }],
        photoMeta: this.folder.photoMeta,
        cover: this.folder.cover,
        canDownload: this.folder.canDownload
      }
    }
  },
  mounted() {
    this.load()
  },
  unmounted() {
    clearTimeout(this.pollTimer)
    this.pollTimer = null
  },
  methods: {
    getPhotoUrl,
    async load() {
      clearTimeout(this.pollTimer)
      const id = this.$route.params.folder_id
      try {
        const folder = (await api.get(`/folders/${id}`)).data
        if (id != this.$route.params.folder_id) return
        this.folder = folder
        this.missing = false
        this.pollProgress()
      } catch (e) {
        if (e.response?.status == 404) this.missing = true
        else throw e
      }
    },
    async setCover(ref) {
      const response = await api.put(
        `/folders/${this.$route.params.folder_id}/cover`,
        { ref }
      )
      this.folder.cover = response.data.cover
    },
    /* While loose photos are being processed, check again now and then. */
    pollProgress() {
      if (!this.folder?.photoStats?.pending) return
      this.pollTimer = setTimeout(async () => {
        try {
          const folder = (
            await api.get(`/folders/${this.$route.params.folder_id}`)
          ).data
          this.folder.photoMeta = folder.photoMeta
          this.folder.photoStats = folder.photoStats
        } catch (e) {
          /* Try again on the next round. */
        }
        if (this.pollTimer) this.pollProgress()
      }, 3000)
    }
  },
  watch: {
    /* Going from one folder to another reuses this component. */
    '$route.params.folder_id'(id) {
      if (id) this.load()
    },
    'session.admin'() {
      this.load()
    }
  }
}
</script>
