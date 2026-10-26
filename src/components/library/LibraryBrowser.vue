<template>
  <div>
    <p v-if="error" class="mb-4 text-sm text-red-600">{{ error }}</p>
    <LibraryPicker
      :model-value="modelValue"
      :multiple="multiple"
      :readonly="readonly"
      :folders="folders"
      :photos="photos"
      :prefix="prefix"
      :loading="loading"
      :labels="labels"
      @update:model-value="$emit('update:modelValue', $event)"
      @open="$emit('update:prefix', $event)"
      @confirm="$emit('confirm')"
    />
  </div>
</template>

<script>
import { loadLibrary, libraryError } from '../../utils/library'

import LibraryPicker from './LibraryPicker.vue'

/**
 * A LibraryPicker that loads the folder of the library it shows (`prefix`)
 * itself, and passes on what it found with `loaded`.
 */
export default {
  name: 'LibraryBrowser',
  components: { LibraryPicker },
  props: {
    prefix: { type: String, default: '' },
    modelValue: { type: [String, Array], default: '' },
    multiple: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    labels: { type: Object, default: () => ({}) }
  },
  emits: ['update:modelValue', 'update:prefix', 'confirm', 'loaded'],
  data: () => ({ folders: [], photos: [], loading: false, error: '' }),
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      const prefix = this.prefix
      this.loading = true
      try {
        const { folders, photos } = await loadLibrary(prefix)
        /* Another folder was opened while this one was loading. */
        if (prefix != this.prefix) return
        Object.assign(this, { folders, photos, error: '' })
      } catch (e) {
        if (prefix != this.prefix) return
        /* A folder that was renamed or removed on the NAS: start at the top. */
        if (e.response?.status == 404 && prefix)
          return this.$emit('update:prefix', '')
        Object.assign(this, { folders: [], photos: [] })
        this.error = libraryError(e)
      } finally {
        if (prefix == this.prefix) this.loading = false
      }
      this.$emit('loaded', { folders: this.folders, photos: this.photos })
    }
  },
  watch: {
    prefix() {
      this.load()
    }
  }
}
</script>
