<template>
  <Popover v-if="status && (status.pending || status.failed)" class="relative">
    <PopoverButton
      :class="[
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2',
        status.pending
          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      ]"
      :title="
        status.pending
          ? `${status.pending} photos are being processed`
          : `${status.failed} photos could not be processed`
      "
    >
      <template v-if="status.pending">
        <RefreshIcon class="h-4 w-4 animate-spin" />
        <span class="ml-1.5">{{ status.pending }}</span>
        <span class="ml-1 hidden sm:inline">to process</span>
      </template>
      <template v-else>
        <ExclamationIcon class="h-4 w-4" />
        <span class="ml-1.5">{{ status.failed }}</span>
        <span class="ml-1 hidden sm:inline">failed</span>
      </template>
    </PopoverButton>

    <PopoverPanel
      class="absolute right-0 z-20 mt-2 w-80 rounded-lg bg-white p-4 text-left shadow-lg ring-1 ring-black ring-opacity-5 sm:w-96"
    >
      <p class="text-sm font-medium text-gray-900">
        {{
          status.pending
            ? `Processing ${status.pending} ${
                status.pending == 1 ? 'photo' : 'photos'
              }`
            : 'Every photo is processed'
        }}
      </p>
      <p class="mt-0.5 text-xs text-gray-500">
        {{ status.ready }} ready<template v-if="eta">
          · about {{ eta }} to go</template
        ><template v-if="status.failed"> · {{ status.failed }} failed</template>
      </p>
      <p v-if="status.current" class="mt-1 truncate text-xs text-gray-500">
        Now: {{ status.current }}
      </p>
      <p v-if="stalled" class="mt-2 text-xs text-amber-700">
        {{ stalled }} {{ stalled == 1 ? 'photo waits' : 'photos wait' }} for the
        photo library, which could not be reached.
      </p>

      <ul class="-mx-2 mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto">
        <li v-for="item in status.items" :key="item.id">
          <router-link
            :to="LINKS[item.kind](item.id)"
            class="block rounded px-2 py-2 hover:bg-gray-50"
          >
            <div class="flex items-center justify-between text-sm">
              <span class="flex min-w-0 items-center font-medium text-gray-900">
                <FolderIcon
                  v-if="item.kind == 'folder'"
                  class="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400"
                />
                <span class="truncate">{{ item.title }}</span>
              </span>
              <span class="ml-3 flex-shrink-0 text-xs text-gray-500">
                {{ item.total - item.pending - item.failedCount }} /
                {{ item.total }}
              </span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                class="h-full rounded-full bg-rose-500 transition-all"
                :style="{ width: `${done(item)}%` }"
              />
            </div>
            <p v-if="item.failedCount" class="mt-1 text-xs text-red-600">
              {{ item.failedCount }} failed:
              {{
                item.failed
                  .map(
                    (photo) =>
                      `${photo.name} (${REASONS[photo.error] || photo.error})`
                  )
                  .join(', ')
              }}<template v-if="item.failedCount > item.failed.length"
                >, …</template
              >
            </p>
          </router-link>
        </li>
      </ul>

      <div
        v-if="stalled || status.failed"
        class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"
      >
        <p class="text-xs text-gray-500">
          {{ retried ? 'Looking at every photo again…' : 'Fixed on the NAS?' }}
        </p>
        <button
          type="button"
          :disabled="retried"
          class="text-sm font-medium text-rose-600 hover:text-rose-500 disabled:opacity-50"
          @click="retry()"
        >
          Try again
        </button>
      </div>
    </PopoverPanel>
  </Popover>
</template>

<script>
import api from '../../api'

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ExclamationIcon, FolderIcon, RefreshIcon } from '@heroicons/vue/solid'

/* How often to look while photos are being processed, in ms. */
const POLL_MS = 4000
/* How long to keep looking after Try again: going over every photo takes a while before anything is queued. */
const RETRY_MS = 30000

/**
 * For the admin, in the top bar: how many photos are still being made into
 * variants, and where, and which ones failed.
 */
export default {
  name: 'ProcessingStatus',
  components: {
    Popover,
    PopoverButton,
    PopoverPanel,
    ExclamationIcon,
    FolderIcon,
    RefreshIcon
  },
  data: () => ({
    LINKS: {
      album: (id) => `/a/${id}`,
      folder: (id) => `/f/${id}`,
      portfolio: () => '/portfolio/edit'
    },
    REASONS: {
      'source-missing': 'not on the NAS',
      unreadable: 'not a photo that can be read',
      failed: 'could not be read'
    },
    status: null,
    /* When Try again was pressed, while that is still being worked on. */
    retried: null
  }),
  computed: {
    /* Photos that wait while nothing is queued: the library was away when they came up. */
    stalled() {
      const { queued, retrying, pending } = this.status
      return queued || retrying ? 0 : pending
    },
    eta() {
      const { queued, msPerPhoto } = this.status
      if (!queued || !msPerPhoto) return ''
      const minutes = Math.round((queued * msPerPhoto) / 60000)
      if (minutes < 1) return 'a minute'
      if (minutes < 60) return `${minutes} min`
      return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
    }
  },
  mounted() {
    this.load()
  },
  unmounted() {
    this.gone = true
    clearTimeout(this.timer)
  },
  methods: {
    done(item) {
      const done = item.total - item.pending - item.failedCount
      return item.total ? Math.round((done / item.total) * 100) : 100
    },
    async load() {
      clearTimeout(this.timer)
      let status
      try {
        status = (
          await api.get('/processing', {
            /* Without the token this is simply not shown. */
            retried: true
          })
        ).data
      } catch (e) {
        status = null
      }
      if (this.gone) return
      this.status = status

      const busy = status && (status.queued || status.retrying)
      if (this.retried && (busy || Date.now() - this.retried > RETRY_MS))
        this.retried = null
      if (busy || this.retried)
        this.timer = setTimeout(() => this.load(), POLL_MS)
    },
    async retry() {
      this.retried = Date.now()
      try {
        await api.post('/processing/retry')
      } catch (e) {
        this.retried = null
        return
      }
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 1500)
    }
  }
}
</script>
