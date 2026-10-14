<template>
  <form @submit.prevent="submit()" class="space-y-8 divide-y divide-gray-200">
    <div>
      <h3 class="text-lg font-medium leading-6 text-gray-900">Homepage</h3>
      <p class="mt-1 text-sm text-gray-500">
        What a visitor without a link sees first. The public folders stay
        reachable under All folders either way.
      </p>

      <div class="mt-6 flex flex-col space-y-6">
        <fieldset>
          <legend class="block text-sm font-medium text-gray-700">Show</legend>
          <div class="mt-2 space-y-2">
            <label
              v-for="(label, value) in HOMEPAGES"
              :key="value"
              class="flex items-center text-sm text-gray-700"
            >
              <input
                v-model="homepage"
                type="radio"
                :value="value"
                class="h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span class="ml-2">{{ label }}</span>
            </label>
          </div>
        </fieldset>

        <div>
          <label
            for="portfolio-title"
            class="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            v-model="portfolio.title"
            type="text"
            id="portfolio-title"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>

        <div>
          <label
            for="portfolio-intro"
            class="block text-sm font-medium text-gray-700"
          >
            Intro
          </label>
          <textarea
            v-model="portfolio.intro"
            id="portfolio-intro"
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>

        <div v-for="field in pickers" :key="field.name">
          <label class="block text-sm font-medium text-gray-700">
            {{ field.label }}
          </label>
          <p class="text-xs text-gray-500">{{ field.help }}</p>
          <div class="mt-1 w-full">
            <Disclosure v-slot="{ open }">
              <DisclosureButton
                class="flex w-full justify-between rounded-lg bg-red-100 px-4 py-2 text-left text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
              >
                <span class="truncate">{{ summary(field) }}</span>
                <ChevronUpIcon
                  :class="open ? 'rotate-180 transform' : ''"
                  class="h-5 w-5 flex-shrink-0 text-red-500"
                />
              </DisclosureButton>
              <DisclosurePanel class="px-4 py-4">
                <LibraryPicker
                  v-model="portfolio[field.name]"
                  :multiple="field.name == 'photos'"
                  :files="files"
                  :prefix="prefix"
                  @open="prefix = $event"
                />
              </DisclosurePanel>
            </Disclosure>
          </div>
        </div>

        <fieldset>
          <legend class="block text-sm font-medium text-gray-700">
            Featured folders and albums
          </legend>
          <p class="text-xs text-gray-500">
            Only public ones can be featured, so the homepage never shows
            anything private. They appear in the order you tick them.
          </p>
          <div
            class="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-3"
          >
            <label
              v-for="item in candidates"
              :key="item.id"
              class="flex items-center text-sm text-gray-700"
            >
              <input
                type="checkbox"
                :checked="isFeatured(item)"
                class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                @change="toggleFeatured(item)"
              />
              <FolderIcon
                v-if="item.kind == 'folder'"
                class="ml-2 h-4 w-4 text-gray-400"
              />
              <PhotographIcon v-else class="ml-2 h-4 w-4 text-gray-400" />
              <span class="ml-1.5">{{ item.path }}</span>
            </label>
            <p
              v-if="loaded && !candidates.length"
              class="text-sm text-gray-500"
            >
              There are no public folders or albums yet.
            </p>
          </div>
        </fieldset>
      </div>
    </div>

    <div class="pt-5">
      <div class="flex items-center justify-end">
        <p v-if="error" class="mr-3 text-sm text-red-600">{{ error }}</p>
        <router-link
          to="/"
          class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >Cancel</router-link
        >
        <button
          type="submit"
          :disabled="saving"
          class="ml-3 inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  </form>
</template>

<script>
import api from '../../api'
import { loadLibrary, libraryError } from '../../utils/library'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ChevronUpIcon, FolderIcon, PhotographIcon } from '@heroicons/vue/solid'

import LibraryPicker from '../library/LibraryPicker.vue'

export default {
  name: 'PortfolioForm',
  components: {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    ChevronUpIcon,
    FolderIcon,
    PhotographIcon,
    LibraryPicker
  },
  data: () => ({
    HOMEPAGES: {
      folders: 'The public folders',
      portfolio: 'The portfolio'
    },
    files: [],
    /* The folder of the photo library being browsed, shared by both pickers. */
    prefix: '',
    homepage: 'folders',
    portfolio: { title: '', intro: '', hero: '', photos: [], featured: [] },
    candidates: [],
    loaded: false,
    error: '',
    saving: false,
    pickers: [
      {
        name: 'hero',
        label: 'Opening photo',
        help: 'Shown large at the top, with the title.'
      },
      {
        name: 'photos',
        label: 'Photos',
        help: 'Your selection, in the order you pick them.'
      }
    ]
  }),
  async mounted() {
    this.updateFiles()
    const { homepage, portfolio, candidates } = (
      await api.get('/settings/source')
    ).data
    this.homepage = homepage || 'folders'
    this.portfolio = {
      title: portfolio?.title || '',
      intro: portfolio?.intro || '',
      hero: portfolio?.hero || '',
      photos: portfolio?.photos || [],
      /* Something featured that is no longer public drops out here. */
      featured: (portfolio?.featured || []).filter((item) =>
        candidates.some((c) => c.id == item.id)
      )
    }
    this.candidates = candidates
    this.loaded = true

    const first = this.portfolio.hero || this.portfolio.photos[0]
    if (first) this.prefix = first.split('/').slice(0, -1).join('/')
  },
  methods: {
    summary(field) {
      const value = this.portfolio[field.name]
      if (Array.isArray(value))
        return value.length ? `${value.length} photos` : 'No photos'
      return value || 'None'
    },
    isFeatured(item) {
      return this.portfolio.featured.some((f) => f.id == item.id)
    },
    toggleFeatured(item) {
      this.portfolio.featured = this.isFeatured(item)
        ? this.portfolio.featured.filter((f) => f.id != item.id)
        : [...this.portfolio.featured, { kind: item.kind, id: item.id }]
    },
    async updateFiles() {
      const prefix = this.prefix
      try {
        const files = await loadLibrary(prefix)
        if (prefix != this.prefix) return
        this.files = files
        this.error = ''
      } catch (e) {
        this.error = libraryError(e)
      }
    },
    async submit() {
      this.error = ''
      this.saving = true
      try {
        await api.put('/settings', {
          homepage: this.homepage,
          portfolio: this.portfolio
        })
        this.$router.push('/')
      } catch (e) {
        this.error =
          e.response?.status == 401
            ? 'The admin token is needed to save the homepage.'
            : e.response?.data?.error == 'featured-not-public'
            ? 'Only public folders and albums can be featured.'
            : 'The homepage could not be saved.'
      } finally {
        this.saving = false
      }
    }
  },
  watch: {
    prefix() {
      this.updateFiles()
    }
  }
}
</script>
