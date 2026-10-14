<template>
  <div class="flex min-h-full flex-col">
    <TopBar />
    <main class="flex flex-1 items-start justify-center px-4 py-24">
      <div v-if="missing" class="text-center">
        <h1 class="text-2xl font-bold text-gray-900">
          This link does not work (any more)
        </h1>
        <p class="mt-2 text-sm text-gray-500">
          Ask the photographer for a new one.
        </p>
      </div>

      <form
        v-else-if="link?.needsPassword"
        class="w-full max-w-sm space-y-4"
        @submit.prevent="unlock()"
      >
        <div class="text-center">
          <LockClosedIcon class="mx-auto h-8 w-8 text-gray-400" />
          <h1 class="mt-2 text-xl font-bold text-gray-900">
            {{ link.title }}
          </h1>
          <p class="mt-1 text-sm text-gray-500">
            Enter the password to see the photos.
          </p>
        </div>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
          required
          autofocus
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
        />
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="busy"
          class="w-full rounded-md bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Open
        </button>
      </form>
    </main>
  </div>
</template>

<script>
import api from '../api'
import { saveShareLink } from '../shareLinks'
import { checkSession } from '../session'
import { LockClosedIcon } from '@heroicons/vue/solid'

import TopBar from '../components/layout/TopBar.vue'

/* /s/<token>: remember the share link (after the password, if it has one) and open what it points at. */
export default {
  name: 'ShareLink',
  components: { LockClosedIcon, TopBar },
  data: () => ({
    link: null,
    missing: false,
    password: '',
    error: '',
    busy: false
  }),
  async mounted() {
    try {
      this.link = (await api.get(`/s/${this.$route.params.token}`)).data
    } catch (e) {
      this.missing = true
      return
    }
    if (!this.link.needsPassword) this.open(this.link.access)
  },
  methods: {
    async unlock() {
      this.error = ''
      this.busy = true
      try {
        const { access } = (
          await api.post(`/s/${this.$route.params.token}`, {
            password: this.password
          })
        ).data
        this.open(access)
      } catch (e) {
        this.error =
          e.response?.status == 429
            ? 'Too many attempts. Try again later.'
            : 'That password is not right.'
      } finally {
        this.busy = false
      }
    },
    open(access) {
      saveShareLink(this.$route.params.token, access)
      checkSession()
      const { kind, id } = this.link
      this.$router.replace(`/${kind == 'folder' ? 'f' : 'a'}/${id}`)
    }
  }
}
</script>
