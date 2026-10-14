<template>
  <div class="flex min-h-full flex-col">
    <TopBar current="Homepage" />
    <main class="flex-1 py-8 xl:py-10">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <PortfolioForm />
      </div>
    </main>
  </div>
</template>

<script>
import PortfolioForm from '../components/portfolio/PortfolioForm.vue'
import TopBar from '../components/layout/TopBar.vue'

export default {
  name: 'PortfolioEdit',
  components: { PortfolioForm, TopBar }
}
</script>
