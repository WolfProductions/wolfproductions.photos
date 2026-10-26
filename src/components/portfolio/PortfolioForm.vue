<template>
  <form @submit.prevent="submit()" @keydown.enter="ignoreEnter($event)">
    <h3 class="text-lg font-medium leading-6 text-gray-900">Homepage</h3>
    <p class="mt-1 text-sm text-gray-500">
      What a visitor without a link sees first. The public folders stay
      reachable under All folders either way.
    </p>

    <RadioPanel
      v-model="homepage"
      label="Show"
      :options="HOMEPAGES"
      class="mt-6"
    />

    <div class="mt-10">
      <h4 class="text-base font-medium text-gray-900">Portfolio</h4>
      <p class="mt-1 text-sm text-gray-500">
        {{
          homepage == 'portfolio'
            ? 'This is what the homepage shows.'
            : 'Not shown now: the homepage shows the public folders. You can prepare it here.'
        }}
      </p>

      <div class="mt-4 space-y-6">
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

        <ImageField
          v-model="portfolio.hero"
          v-model:prefix="prefix"
          label="Opening photo"
          help="Shown large at the top, with the title. Click the star on a photo below, or choose any photo from the library."
        />

        <div>
          <span class="block text-sm font-medium text-gray-700">Photos</span>
          <p class="text-xs text-gray-500">
            Shown in this order. Drag a photo, or use its arrows, to move it.
          </p>
          <div class="mt-2">
            <OrderedPhotos
              v-if="portfolio.photos.length"
              v-model:photos="portfolio.photos"
              :cover="portfolio.hero"
              star-title="Use as the opening photo"
              starred-title="The opening photo"
              @cover="portfolio.hero = $event"
            />
            <button
              v-else
              type="button"
              class="flex h-20 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400"
              @click="picking = true"
            >
              <PhotographIcon class="mr-2 h-5 w-5 text-gray-400" />
              No photos yet
            </button>
          </div>
          <div class="mt-2 flex items-center text-sm">
            <span class="text-gray-500">
              {{ portfolio.photos.length }}
              {{ portfolio.photos.length == 1 ? 'photo' : 'photos' }}
            </span>
            <button
              type="button"
              class="ml-4 font-medium text-red-600 hover:text-red-500"
              @click="picking = true"
            >
              {{
                portfolio.photos.length
                  ? 'Add or take out photos…'
                  : 'Choose photos…'
              }}
            </button>
          </div>
          <PhotoPickerDialog
            :open="picking"
            title="Photos of the homepage"
            :model-value="portfolio.photos"
            multiple
            v-model:prefix="prefix"
            @update:model-value="portfolio.photos = $event"
            @close="picking = false"
          />
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
            class="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-3"
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
                class="ml-2 h-4 w-4 flex-shrink-0 text-gray-400"
              />
              <PhotographIcon
                v-else
                class="ml-2 h-4 w-4 flex-shrink-0 text-gray-400"
              />
              <span class="ml-1.5 min-w-0 truncate">{{ item.path }}</span>
              <span
                v-if="isFeatured(item)"
                class="ml-2 flex h-5 min-w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
                :title="`Shown as number ${featuredNumber(item)}`"
              >
                {{ featuredNumber(item) }}
              </span>
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

    <div
      class="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div class="flex flex-wrap items-center justify-end gap-3">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <router-link
          to="/"
          class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >Cancel</router-link
        >
        <button
          type="submit"
          :disabled="saving"
          class="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </form>
</template>

<script>
import api from '../../api'

import { FolderIcon, PhotographIcon } from '@heroicons/vue/solid'

import ImageField from '../library/ImageField.vue'
import OrderedPhotos from '../library/OrderedPhotos.vue'
import PhotoPickerDialog from '../library/PhotoPickerDialog.vue'
import RadioPanel from '../library/RadioPanel.vue'

export default {
  name: 'PortfolioForm',
  components: {
    FolderIcon,
    PhotographIcon,
    ImageField,
    OrderedPhotos,
    PhotoPickerDialog,
    RadioPanel
  },
  data: () => ({
    HOMEPAGES: [
      {
        value: 'folders',
        label: 'The public folders',
        description: 'The top-level folders that are public, as cards.'
      },
      {
        value: 'portfolio',
        label: 'The portfolio',
        description:
          'A title and intro over the opening photo, then your photos and what you feature.'
      }
    ],
    /* The folder of the photo library being browsed, shared by both pickers. */
    prefix: '',
    /* Whether the photos are being chosen. */
    picking: false,
    homepage: 'folders',
    portfolio: { title: '', intro: '', hero: '', photos: [], featured: [] },
    candidates: [],
    loaded: false,
    error: '',
    saving: false,
    /* Saved: leaving the page is fine. */
    done: false,
    /* What was last loaded, to tell whether anything changed. */
    saved: ''
  }),
  computed: {
    dirty() {
      return JSON.stringify(this.fields()) != this.saved
    }
  },
  created() {
    this.saved = JSON.stringify(this.fields())
  },
  async mounted() {
    window.addEventListener('beforeunload', this.warnBeforeUnload)
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
    this.saved = JSON.stringify(this.fields())

    const first = this.portfolio.hero || this.portfolio.photos[0]
    if (first) this.prefix = first.split('/').slice(0, -1).join('/')
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.warnBeforeUnload)
  },
  methods: {
    fields() {
      return { homepage: this.homepage, portfolio: this.portfolio }
    },
    /* Whether the page may be left: asked when there are changes that were not saved. */
    mayLeave() {
      return (
        this.done ||
        !this.dirty ||
        window.confirm('Leave without saving the changes to the homepage?')
      )
    },
    warnBeforeUnload(event) {
      if (this.done || !this.dirty) return
      event.preventDefault()
      event.returnValue = ''
    },
    /* Enter in a field would save the whole homepage. */
    ignoreEnter(event) {
      if (event.target.tagName == 'INPUT') event.preventDefault()
    },
    isFeatured(item) {
      return this.portfolio.featured.some((f) => f.id == item.id)
    },
    featuredNumber(item) {
      return this.portfolio.featured.findIndex((f) => f.id == item.id) + 1
    },
    toggleFeatured(item) {
      this.portfolio.featured = this.isFeatured(item)
        ? this.portfolio.featured.filter((f) => f.id != item.id)
        : [...this.portfolio.featured, { kind: item.kind, id: item.id }]
    },
    async submit() {
      this.error = ''
      this.saving = true
      try {
        await api.put('/settings', this.fields())
        this.done = true
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
  }
}
</script>
