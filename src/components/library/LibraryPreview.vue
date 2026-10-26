<template>
  <span ref="box" :class="['block overflow-hidden', !logo && 'bg-gray-100']">
    <img
      v-if="url"
      :src="url"
      alt=""
      draggable="false"
      :class="[
        'h-full w-full',
        cover ? 'object-cover' : 'object-contain',
        logo && 'object-left'
      ]"
    />
    <span
      v-else-if="failed"
      class="flex h-full w-full items-center justify-center"
    >
      <PhotographIcon class="h-6 w-6 text-gray-300" />
    </span>
    <span v-else class="block h-full w-full animate-pulse bg-gray-200" />
  </span>
</template>

<script>
import { PhotographIcon } from '@heroicons/vue/outline'
import { loadPreview, releasePreview } from '../../utils/library'

/**
 * The preview of one original in the library, by its key. It is only
 * fetched while it is (nearly) on screen.
 */
export default {
  name: 'LibraryPreview',
  components: { PhotographIcon },
  props: {
    photoKey: { type: String, required: true },
    /* Fill the box, cropping the photo, instead of showing all of it. */
    cover: { type: Boolean, default: false },
    /* Shown as in the top bar: at the left, on no background. */
    logo: { type: Boolean, default: false }
  },
  data: () => ({ url: '', failed: false, requested: '' }),
  mounted() {
    this.observer = new IntersectionObserver(
      /* Scrolled past before it was fetched: the ones on screen go first. */
      ([entry]) => {
        this.visible = entry.isIntersecting
        if (this.visible) this.request()
        else if (!this.url) this.release()
      },
      { rootMargin: '200px' }
    )
    this.observer.observe(this.$refs.box)
  },
  beforeUnmount() {
    this.observer.disconnect()
    this.release()
  },
  methods: {
    async request() {
      const key = this.photoKey
      if (this.requested == key || this.failed) return
      this.release()
      this.requested = key
      try {
        const url = await loadPreview(key)
        if (this.requested == key) this.url = url
      } catch (e) {
        /* A failed preview is not ours to release. */
        if (this.requested == key) {
          this.requested = ''
          this.failed = true
        }
      }
    },
    release() {
      if (this.requested) releasePreview(this.requested)
      this.requested = ''
    }
  },
  watch: {
    photoKey() {
      this.release()
      this.url = ''
      this.failed = false
      if (this.visible) this.request()
    }
  }
}
</script>
