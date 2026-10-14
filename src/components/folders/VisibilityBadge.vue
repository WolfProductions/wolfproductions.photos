<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
    :class="
      visibility == 'public'
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-700'
    "
    :title="inherited ? 'Same as the folder above' : ''"
  >
    <EyeIcon v-if="visibility == 'public'" class="mr-1 h-3 w-3" />
    <LockClosedIcon v-else class="mr-1 h-3 w-3" />
    {{ visibility == 'public' ? 'Public' : 'Private' }}
  </span>
</template>

<script>
import { EyeIcon, LockClosedIcon } from '@heroicons/vue/solid'

/* Only the admin sees these: whether visitors can see a folder or album. */
export default {
  name: 'VisibilityBadge',
  components: { EyeIcon, LockClosedIcon },
  props: {
    visibility: { type: String, default: 'private' },
    inherited: { type: Boolean, default: false }
  }
}
</script>
