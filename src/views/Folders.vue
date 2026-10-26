<template>
  <div class="flex min-h-full flex-col">
    <TopBar :current="portfolio ? 'All folders' : ''">
      <button
        v-if="folders.length > 1 && !ordering"
        type="button"
        class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        @click="startOrdering()"
      >
        Change order
      </button>
      <AdminButton to="/portfolio/edit">Homepage</AdminButton>
      <AdminButton :to="{ path: '/f/new' }" primary>New folder</AdminButton>
    </TopBar>

    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto space-y-10 px-4 sm:px-6 lg:px-8">
        <SharedWithYou />
        <CardGrid
          v-if="otherFolders.length"
          :items="ordering ? ordering.folders : otherFolders"
          :ordering="Boolean(ordering)"
          type="folder"
          @update:items="ordering.folders = $event"
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

        <OrderBar
          v-if="ordering"
          :saving="ordering.saving"
          :error="ordering.error"
          @cancel="ordering = null"
          @save="saveOrder()"
        >
          Drag the cards, or use their arrows.
        </OrderBar>
      </div>
    </main>
  </div>
</template>

<script>
import api from '../api'
import { session } from '../session'

import AdminButton from '../components/layout/AdminButton.vue'
import CardGrid from '../components/folders/CardGrid.vue'
import OrderBar from '../components/folders/OrderBar.vue'
import SharedWithYou from '../components/shares/SharedWithYou.vue'
import TopBar from '../components/layout/TopBar.vue'

/* The top-level folders: for a visitor the public ones, for the admin all of them. */
export default {
  name: 'Folders',
  components: { AdminButton, CardGrid, OrderBar, SharedWithYou, TopBar },
  props: {
    /* Whether the homepage is the portfolio, so this list is a page of its own. */
    portfolio: { type: Boolean, default: true }
  },
  data: () => ({
    folders: [],
    loaded: false,
    session,
    /* While the admin puts the folders in order: { folders, saving, error }. */
    ordering: null
  }),
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
      this.ordering = null
      this.folders = (await api.get('/folders/root')).data
      this.loaded = true
    },
    startOrdering() {
      this.ordering = { folders: [...this.folders], saving: false, error: '' }
    },
    async saveOrder() {
      const ordering = this.ordering
      ordering.saving = true
      ordering.error = ''
      try {
        await api.put('/folders/root/order', {
          folders: ordering.folders.map((item) => item._id)
        })
        await this.load()
      } catch (e) {
        ordering.error = 'The order could not be saved.'
        ordering.saving = false
      }
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
