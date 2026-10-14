<template>
  <div class="flex min-h-full flex-col">
    <TopBar :current="portfolio ? 'All folders' : ''">
      <AdminButton to="/portfolio/edit">Homepage</AdminButton>
      <AdminButton :to="{ path: '/f/new' }" primary>New folder</AdminButton>
    </TopBar>

    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
        <SharedWithYou />
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
import SharedWithYou from '../components/shares/SharedWithYou.vue'
import TopBar from '../components/layout/TopBar.vue'

/* The top-level folders: for a visitor the public ones, for the admin all of them. */
export default {
  name: 'Folders',
  components: { AdminButton, CardGrid, SharedWithYou, TopBar },
  props: {
    /* Whether the homepage is the portfolio, so this list is a page of its own. */
    portfolio: { type: Boolean, default: true }
  },
  data: () => ({ folders: [], loaded: false, session }),
  computed: {
    /* A shared top-level folder is already listed under Shared with you. */
    otherFolders() {
      if (this.session.admin) return this.folders
      const shared = new Set(this.session.shared.map((item) => item._id))
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
