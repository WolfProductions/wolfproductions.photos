<template>
  <div
    class="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
  >
    <div class="flex flex-wrap items-center justify-end gap-3">
      <p class="mr-auto text-sm text-gray-500"><slot /></p>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="saving"
        class="inline-flex justify-center rounded-md border border-transparent bg-rose-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50"
        @click="$emit('save')"
      >
        {{ saving ? 'Saving…' : 'Save order' }}
      </button>
    </div>
  </div>
</template>

<script>
/* The bar at the bottom of a page while the admin puts its cards in order. */
export default {
  name: 'OrderBar',
  props: {
    saving: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  emits: ['cancel', 'save']
}
</script>
