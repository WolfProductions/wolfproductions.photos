<template>
  <div class="flex min-h-full flex-col">
    <TopBar>
      <AdminButton :to="{ path: '/f/new' }" primary>New folder</AdminButton>
    </TopBar>

    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
        <section v-if="sharedFolders.length || sharedAlbums.length">
          <h2 class="mb-4 text-lg font-medium text-gray-900">
            Shared with you
          </h2>
          <div class="space-y-8">
            <CardGrid
              v-if="sharedFolders.length"
              :items="sharedFolders"
              type="folder"
            />
            <CardGrid
              v-if="sharedAlbums.length"
              :items="sharedAlbums"
              type="album"
            />
          </div>
        </section>
        <CardGrid
          v-if="otherFolders.length"
          :items="otherFolders"
          type="folder"
        />
        <p
          v-else-if="loaded && !session.shared.length"
          class="py-24 text-center text-sm text-gray-500"
        >
          {{
            session.admin
              ? 'There are no folders yet.'
              : 'There is nothing to see here yet.'
          }}
        </p>
      </div>
    </main>
  </div>
</template>

<script>
import api from '../api'
import { session } from '../session'

import AdminButton from '../components/layout/AdminButton.vue'
import CardGrid from '../components/folders/CardGrid.vue'
import TopBar from '../components/layout/TopBar.vue'

/* The top-level folders: for a visitor the public ones, for the admin all of them. */
export default {
  name: 'Home',
  components: { AdminButton, CardGrid, TopBar },
  data: () => ({ folders: [], loaded: false, session }),
  computed: {
    /* What the share links this visitor opened point at; the admin sees it all anyway. */
    sharedFolders() {
      if (this.session.admin) return []
      return this.session.shared.filter((item) => item.kind == 'folder')
    },
    sharedAlbums() {
      if (this.session.admin) return []
      return this.session.shared.filter((item) => item.kind == 'album')
    },
    /* A shared top-level folder is already listed above. */
    otherFolders() {
      const shared = new Set(this.sharedFolders.map((folder) => folder._id))
      return this.folders.filter((folder) => !shared.has(folder._id))
    }
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.folders = (await api.get('/folders/root')).data
      this.loaded = true
    }
  },
  watch: {
    /* Logging in or out changes what is visible. */
    'session.admin'() {
      this.load()
    }
  }
}
</script>
