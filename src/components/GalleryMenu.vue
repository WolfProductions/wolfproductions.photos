<template>
  <div
    class="sticky top-0 flex w-full flex-col space-y-2 bg-white py-3 px-3 md:flex-row md:space-y-0 md:px-7"
  >
    <!-- Title section -->
    <div class="mr-12 flex flex-col justify-center">
      <h1 class="min-w-max text-xl font-semibold leading-tight">
        {{ gallery.title }}
      </h1>
      <p class="text-base font-light">
        {{ gallery.date }}
      </p>
    </div>

    <!-- Gallery section -->
    <div class="flex items-center overflow-x-auto pb-1.5 md:space-x-4 md:pb-0">
      <span
        :class="[
          section.active
            ? 'border-b border-gray-800 font-normal text-gray-900 md:border-b-0'
            : 'text-gray-400',
          'md:py- min-w-max cursor-pointer px-4 py-1 text-sm font-light hover:text-gray-700'
        ]"
        v-for="section in gallery.sections"
        :key="section"
        >{{ section.title }}</span
      >
    </div>

    <!-- Download button -->
  </div>
</template>

<script>
export default {
  name: 'GalleryMenu',
  data: () => ({
    gallery: {
      title: 'Evening of the Band',
      date: '22 may 2022',
      sections: [
        {
          title: 'Highlights',
          url: '#',
          active: true
        },
        {
          title: 'King Blue',
          url: '#',
          active: false
        },
        {
          title: 'John Mayer Tribute',
          url: '#',
          active: false
        },
        {
          title: 'Dirtey Classy',
          url: '#',
          active: false
        }
      ]
    }
  })
}
</script>
