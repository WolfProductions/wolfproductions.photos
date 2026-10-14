<template>
  <router-link
    :to="to"
    class="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
    :class="
      primary
        ? 'border-transparent bg-rose-600 text-white hover:bg-rose-700'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    "
  >
    <slot />
  </router-link>
</template>

<script>
export default {
  name: 'AdminButton',
  props: {
    to: { type: [String, Object], required: true },
    primary: { type: Boolean, default: false }
  }
}
</script>
