<template>
  <div class="relative">
    <GalleryHeader />
    <GalleryMenu />
    <GalleryPhotos />
  </div>
</template>

<script>
import GalleryHeader from './GalleryHeader.vue'
import GalleryMenu from './GalleryMenu.vue'
import GalleryPhotos from './GalleryPhotos.vue'

export default {
  name: 'Page',
  components: {
    GalleryHeader,
    GalleryMenu,
    GalleryPhotos
  }
}
</script>
