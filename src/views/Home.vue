<template>
  <div class="flex min-h-full flex-col">
    <TopBar>
      <AdminButton :to="{ path: '/f/new' }" primary>New folder</AdminButton>
    </TopBar>

    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <CardGrid v-if="folders.length" :items="folders" type="folder" />
        <p v-else-if="loaded" class="py-24 text-center text-sm text-gray-500">
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
