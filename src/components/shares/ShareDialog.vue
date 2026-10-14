<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-50" @close="$emit('close')">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75" />
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-start justify-center p-4 sm:p-8">
          <DialogPanel
            class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl"
          >
            <div class="flex items-start justify-between">
              <div>
                <DialogTitle class="text-lg font-medium text-gray-900">
                  Share “{{ target.title }}”
                </DialogTitle>
                <p class="mt-1 text-sm text-gray-500">
                  Anyone with a link sees this
                  {{
                    target.kind == 'folder'
                      ? 'folder and everything in it'
                      : 'album'
                  }}, even when it is private. Deleting a link takes the access
                  away at once.
                </p>
              </div>
              <button
                type="button"
                class="ml-4 text-gray-400 hover:text-gray-600"
                @click="$emit('close')"
              >
                <XIcon class="h-5 w-5" />
                <span class="sr-only">Close</span>
              </button>
            </div>

            <ul class="mt-6 space-y-4">
              <li
                v-for="share in links"
                :key="share._id"
                class="rounded-md border border-gray-200 p-4"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-gray-900">
                    {{ share.label || 'Link' }}
                    <span
                      v-if="share.expired"
                      class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                      >Expired</span
                    >
                  </p>
                  <button
                    type="button"
                    class="text-sm font-medium text-red-600 hover:text-red-500"
                    @click="remove(share)"
                  >
                    Delete
                  </button>
                </div>
                <div class="mt-2 flex">
                  <input
                    :value="urlOf(share)"
                    readonly
                    class="block w-full min-w-0 flex-1 rounded-l-md border-gray-300 bg-gray-50 text-sm text-gray-700"
                    @focus="$event.target.select()"
                  />
                  <button
                    type="button"
                    class="rounded-r-md border border-l-0 border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    @click="copy(share)"
                  >
                    {{ copied == share._id ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <div
                  class="mt-3 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-3"
                >
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      :checked="share.allowDownload"
                      class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      @change="
                        update(share, { allowDownload: $event.target.checked })
                      "
                    />
                    <span class="ml-2">Allow downloads</span>
                  </label>
                  <label class="flex items-center">
                    <span class="mr-2 whitespace-nowrap">Expires</span>
                    <input
                      type="date"
                      :value="dateOf(share.expiresAt)"
                      class="block w-full rounded-md border-gray-300 py-1 text-sm"
                      @change="
                        update(share, {
                          expiresAt: $event.target.value || null
                        })
                      "
                    />
                  </label>
                  <div class="flex items-center">
                    <template v-if="share.hasPassword">
                      <LockClosedIcon class="mr-1 h-4 w-4 text-gray-400" />
                      <span>Password</span>
                      <button
                        type="button"
                        class="ml-2 text-red-600 hover:text-red-500"
                        @click="update(share, { password: null })"
                      >
                        Remove
                      </button>
                    </template>
                    <button
                      v-else
                      type="button"
                      class="text-red-600 hover:text-red-500"
                      @click="setPassword(share)"
                    >
                      Add password
                    </button>
                  </div>
                </div>
              </li>
              <li v-if="loaded && !links.length" class="text-sm text-gray-500">
                There are no links yet.
              </li>
            </ul>

            <form
              class="mt-6 space-y-3 border-t border-gray-200 pt-6"
              @submit.prevent="create()"
            >
              <h3 class="text-sm font-medium text-gray-900">New link</h3>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  v-model="draft.label"
                  type="text"
                  placeholder="Name, e.g. Leden 2025"
                  class="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                />
                <input
                  v-model="draft.password"
                  type="text"
                  autocomplete="off"
                  placeholder="Password (optional)"
                  class="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                />
                <input
                  v-model="draft.expiresAt"
                  type="date"
                  title="Expires (optional)"
                  class="block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div class="flex items-center justify-between">
                <label class="flex items-center text-sm text-gray-700">
                  <input
                    v-model="draft.allowDownload"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span class="ml-2">Allow downloads</span>
                </label>
                <button
                  type="submit"
                  :disabled="busy"
                  class="rounded-md bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Create link
                </button>
              </div>
              <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script>
import moment from 'moment'
import api from '../../api'

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot
} from '@headlessui/vue'
import { LockClosedIcon, XIcon } from '@heroicons/vue/solid'

const emptyDraft = () => ({
  label: '',
  password: '',
  expiresAt: '',
  allowDownload: false
})

/* The share links of one folder or album: make, change, copy and delete them. */
export default {
  name: 'ShareDialog',
  components: {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionRoot,
    LockClosedIcon,
    XIcon
  },
  props: {
    open: { type: Boolean, default: false },
    /* { kind: 'folder' | 'album', id, title } */
    target: { type: Object, required: true }
  },
  emits: ['close'],
  data: () => ({
    links: [],
    loaded: false,
    draft: emptyDraft(),
    busy: false,
    error: '',
    copied: null
  }),
  watch: {
    open(open) {
      if (open) this.load()
    }
  },
  methods: {
    async load() {
      this.links = (
        await api.get('/shares', { params: { target: this.target.id } })
      ).data
      this.loaded = true
    },
    urlOf(share) {
      return `${window.location.origin}/s/${share.token}`
    },
    dateOf(value) {
      return value ? moment(value).format('YYYY-MM-DD') : ''
    },
    async copy(share) {
      try {
        await navigator.clipboard.writeText(this.urlOf(share))
        this.copied = share._id
        setTimeout(() => (this.copied = null), 2000)
      } catch (e) {
        window.prompt('Copy the link', this.urlOf(share))
      }
    },
    async create() {
      this.error = ''
      this.busy = true
      try {
        const { label, password, expiresAt, allowDownload } = this.draft
        const share = (
          await api.post('/shares', {
            target: { kind: this.target.kind, id: this.target.id },
            label,
            password: password || undefined,
            expiresAt: expiresAt || null,
            allowDownload
          })
        ).data
        this.links.unshift(share)
        this.draft = emptyDraft()
      } catch (e) {
        this.error = 'The link could not be made.'
      } finally {
        this.busy = false
      }
    },
    async update(share, fields) {
      this.error = ''
      try {
        const updated = (await api.put(`/shares/${share._id}`, fields)).data
        this.links.splice(this.links.indexOf(share), 1, updated)
      } catch (e) {
        this.error = 'The link could not be changed.'
      }
    },
    setPassword(share) {
      const password = window.prompt('Password for this link')
      if (password) this.update(share, { password })
    },
    async remove(share) {
      if (
        !window.confirm(
          `Delete "${share.label || 'Link'}"? Whoever has it loses access.`
        )
      )
        return
      try {
        await api.delete(`/shares/${share._id}`)
        this.links.splice(this.links.indexOf(share), 1)
      } catch (e) {
        this.error = 'The link could not be deleted.'
      }
    }
  }
}
</script>
