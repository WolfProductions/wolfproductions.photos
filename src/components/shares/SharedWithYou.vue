<template>
  <section v-if="folders.length || albums.length">
    <h2 class="mb-4 text-lg font-medium text-gray-900">Shared with you</h2>
    <div class="space-y-8">
      <CardGrid v-if="folders.length" :items="folders" type="folder" />
      <CardGrid v-if="albums.length" :items="albums" type="album" />
    </div>
  </section>
</template>

<script>
import { session } from '../../session'
import CardGrid from '../folders/CardGrid.vue'

/* What the share links this visitor opened point at; the admin sees it all anyway. */
export default {
  name: 'SharedWithYou',
  components: { CardGrid },
  data: () => ({ session }),
  computed: {
    folders() {
      if (this.session.admin) return []
      return this.session.shared.filter((item) => item.kind == 'folder')
    },
    albums() {
      if (this.session.admin) return []
      return this.session.shared.filter((item) => item.kind == 'album')
    }
  }
}
</script>
