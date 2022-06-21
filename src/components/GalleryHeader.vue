<template>
  <div class="relative w-full h-screen overflow-hidden">
    <img
      class="w-full h-full object-cover"
      src="https://unsplash.com/photos/XPb0xbRY4Ss/download?ixid=MnwxMjA3fDB8MXx0b3BpY3x8Ym84alFLVGFFMFl8fHx8fDJ8fDE2NTU4MTczMTQ&force=true"
      alt="Background image gallery cover"
    />

    <!-- WolfProductions logo -->
    <img
      class="absolute top-8 left-8 h-8 w-auto"
      :src="Logo"
      alt="WolfProductions logo"
    />

    <!-- Information about gallery -->
    <div class="absolute bottom-8 px-8 sm:bottom-16 sm:px-16 w-full flex flex-col sm:flex-row justify-between sm:items-end">
      <div class="text-white flex flex-col space-y-2 sm:space-y-4 mb-4 sm:mb-0">
        <!-- Gallery title -->
        <h1 class="text-4xl sm:text-7xl font-bold leading-tight">
          {{ gallery.title }}
        </h1>
        <!-- Date -->
        <p class="text-xl">
          {{ gallery.date }}
        </p>
      </div>
      <div>
        <!-- Scroll down button -->
        <button
          type="button"
          class="inline-flex min-w-max items-center px-4 py-2 border border-white text-base font-medium rounded text-white bg-transparent focus:outline-none"
        >
          Show gallery
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Logo from '../assets/white_text_bg.svg'

export default {
  name: 'GalleryHeader',
  data: () => ({
    Logo,
    gallery: {
      title: 'Evening of the Band',
      date: '22 may 2022'
    }
  })
}
</script>
