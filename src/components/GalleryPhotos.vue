<template>
  <!-- Photos grid -->
  <div
    class="mx-2 mb-6 grid grid-cols-2 gap-1.5 md:mx-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
  >
    <img
      v-for="i in 30"
      :key="i"
      class="aspect-video h-auto w-full object-cover"
      src="https://unsplash.com/photos/aAd6zv2rdBI/download?ixid=MnwxMjA3fDB8MXx0b3BpY3x8Ym84alFLVGFFMFl8fHx8fDJ8fDE2NTU4MTYyMzA&force=true&w=640"
      alt=""
    />
  </div>
</template>

<script>
export default {
  name: 'GalleryPhotos'
}
</script>
