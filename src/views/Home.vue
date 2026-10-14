<template>
  <Portfolio
    v-if="settings?.homepage == 'portfolio'"
    :portfolio="settings.portfolio"
  />
  <Folders v-else-if="settings" :portfolio="false" />
</template>

<script>
import api from '../api'

import Folders from './Folders.vue'
import Portfolio from './Portfolio.vue'

/* The homepage: the portfolio or the public folders, as set in the settings. */
export default {
  name: 'Home',
  components: { Folders, Portfolio },
  data: () => ({ settings: null }),
  async mounted() {
    try {
      this.settings = (await api.get('/settings')).data
    } catch (e) {
      this.settings = { homepage: 'folders' }
    }
  }
}
</script>
