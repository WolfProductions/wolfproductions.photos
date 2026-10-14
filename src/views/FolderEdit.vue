<template>
  <div class="flex min-h-full flex-col">
    <TopBar :current="title" />
    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <FolderForm
          :key="$route.fullPath"
          @loaded="title = $event.title || 'New folder'"
        />
      </div>
    </main>
  </div>
</template>

<script>
import FolderForm from '../components/folders/FolderForm.vue'
import TopBar from '../components/layout/TopBar.vue'

export default {
  name: 'FolderEdit',
  components: { FolderForm, TopBar },
  data: () => ({ title: '' })
}
</script>
