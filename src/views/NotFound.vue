<template>
  <div class="flex min-h-full flex-col">
    <TopBar />
    <main class="flex-1 py-24 text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-rose-600">
        404
      </p>
      <h1 class="mt-2 text-2xl font-bold text-gray-900">
        This page does not exist
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Or it is not shared. Check the link you were given.
      </p>
      <router-link
        to="/"
        class="mt-6 inline-block text-sm font-medium text-rose-600 hover:text-rose-500"
        >Go to the home page</router-link
      >
    </main>
  </div>
</template>

<script>
import TopBar from '../components/layout/TopBar.vue'

export default {
  name: 'NotFound',
  components: { TopBar }
}
</script>
