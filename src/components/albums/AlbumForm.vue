<template>
  <AlbumStart
    v-if="step == 'start'"
    v-model:prefix="prefix"
    @start="start($event)"
    @skip="step = 'form'"
  />

  <form v-else @submit.prevent="submit()" @keydown.enter="ignoreEnter($event)">
    <h3 class="text-lg font-medium leading-6 text-gray-900">
      {{ albumId ? 'Edit album' : 'New album' }}
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      <template v-if="albumId">Change the album, then save it.</template>
      <template v-else-if="startedFrom">
        Filled in from the NAS folder {{ startedFrom }}.
        <button
          type="button"
          class="font-medium text-red-600 hover:text-red-500"
          @click="step = 'start'"
        >
          Choose another folder
        </button>
      </template>
      <template v-else>
        Fill in the album, or
        <button
          type="button"
          class="font-medium text-red-600 hover:text-red-500"
          @click="step = 'start'"
        >
          start from a folder on the NAS</button
        >.
      </template>
    </p>

    <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-6">
      <div class="sm:col-span-4">
        <label
          for="album-title"
          class="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          ref="title"
          v-model="album.title"
          type="text"
          id="album-title"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="album-date" class="block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          v-model="album.date"
          type="date"
          id="album-date"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
        />
      </div>

      <div class="sm:col-span-6">
        <label class="block text-sm font-medium text-gray-700">Folder</label>
        <div class="mt-1">
          <FolderSelect v-model="album.folder" :options="folders" />
        </div>
        <p v-if="folderError" class="mt-1 text-sm text-red-600">
          Choose the folder the album goes in.
        </p>
      </div>

      <VisibilitySelect
        v-model="album.visibility"
        :inherited="inheritedVisibility"
        class="sm:col-span-6"
      />

      <ImageField
        v-model="album.cover"
        v-model:prefix="prefix"
        label="Cover"
        help="Shown at the top of the album and on its card. Click the star on a photo below, or choose any photo from the library."
        class="sm:col-span-6"
      />
    </div>

    <div class="mt-10">
      <div class="flex items-baseline justify-between">
        <h4 class="text-base font-medium text-gray-900">Sections</h4>
        <p class="text-sm text-gray-500">
          {{ total }} {{ total == 1 ? 'photo' : 'photos' }} in all
        </p>
      </div>
      <p class="mt-1 text-sm text-gray-500">
        The gallery shows the sections and their photos in this order. Drag a
        photo, or use its arrows, to move it.
      </p>

      <div class="mt-4 space-y-4">
        <section
          v-for="(section, index) in album.sections"
          :key="section.uid"
          :data-section="section.uid"
          class="rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          <div
            class="flex items-center gap-2 border-b border-gray-200 px-2 py-2 sm:px-3"
          >
            <input
              v-model="section.title"
              type="text"
              required
              placeholder="Section title"
              aria-label="Section title"
              class="min-w-0 flex-1 rounded-md border-transparent px-2 py-1.5 text-sm font-medium text-gray-900 hover:border-gray-300 focus:border-red-500 focus:ring-red-500"
            />
            <span class="whitespace-nowrap text-sm text-gray-500">
              {{ section.photos.length }}
              {{ section.photos.length == 1 ? 'photo' : 'photos' }}
            </span>
            <div class="flex items-center">
              <button
                type="button"
                :class="ICON_BUTTON"
                :disabled="index == 0"
                title="Move the section up"
                @click="moveSection(index, index - 1)"
              >
                <ArrowUpIcon class="h-4 w-4" />
                <span class="sr-only">Move the section up</span>
              </button>
              <button
                type="button"
                :class="ICON_BUTTON"
                :disabled="index == album.sections.length - 1"
                title="Move the section down"
                @click="moveSection(index, index + 1)"
              >
                <ArrowDownIcon class="h-4 w-4" />
                <span class="sr-only">Move the section down</span>
              </button>
              <button
                type="button"
                :class="ICON_BUTTON"
                title="Delete the section"
                @click="removeSection(index)"
              >
                <TrashIcon class="h-4 w-4" />
                <span class="sr-only">Delete the section</span>
              </button>
            </div>
          </div>

          <div class="p-3 sm:p-4">
            <SectionPhotos
              v-if="section.photos.length"
              v-model:photos="section.photos"
              :cover="album.cover"
              @cover="album.cover = $event"
            />
            <button
              v-else
              type="button"
              class="flex h-20 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400"
              @click="picking = section"
            >
              <PhotographIcon class="mr-2 h-5 w-5 text-gray-400" />
              No photos yet
            </button>
            <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <button
                type="button"
                class="font-medium text-red-600 hover:text-red-500"
                @click="picking = section"
              >
                {{
                  section.photos.length
                    ? 'Add or take out photos…'
                    : 'Choose photos…'
                }}
              </button>
              <button
                v-if="section.photos.length > 1"
                type="button"
                class="font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
                :disabled="sorting == section.uid"
                @click="sortSection(section)"
              >
                {{ sorting == section.uid ? 'Sorting…' : 'Sort by date taken' }}
              </button>
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        class="mt-4 flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800"
        @click="addSection()"
      >
        <PlusIcon class="mr-1.5 h-5 w-5" />
        Add section
      </button>
    </div>

    <div
      class="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          v-if="albumId"
          type="button"
          class="mr-auto text-sm font-medium text-red-600 hover:text-red-500"
          @click="remove()"
        >
          Delete album
        </button>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <router-link
          :to="cancelTo"
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

    <PhotoPickerDialog
      :open="Boolean(picking)"
      :title="`Photos of ${picking?.title || 'the section'}`"
      :model-value="picking ? picking.photos : []"
      multiple
      v-model:prefix="prefix"
      :labels="picking ? labelsFor(picking) : {}"
      @update:model-value="picking.photos = $event"
      @close="picking = null"
    />
  </form>
</template>

<script>
import api from '../../api'
import moment from 'moment'
import { inheritedVisibility } from '../../utils/folders'
import { lastStartFolder, loadDates, sortByTaken } from '../../utils/library'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/solid'
import { PhotographIcon } from '@heroicons/vue/outline'

import AlbumStart from './AlbumStart.vue'
import SectionPhotos from './SectionPhotos.vue'
import FolderSelect from '../library/FolderSelect.vue'
import ImageField from '../library/ImageField.vue'
import PhotoPickerDialog from '../library/PhotoPickerDialog.vue'
import VisibilitySelect from '../library/VisibilitySelect.vue'

/* Sections are told apart by their id, or by a number until they have one. */
let nextUid = 0
const withUid = (section) => ({
  ...section,
  uid: section._id || `new-${++nextUid}`
})

export default {
  name: 'AlbumForm',
  components: {
    ArrowDownIcon,
    ArrowUpIcon,
    PlusIcon,
    TrashIcon,
    PhotographIcon,
    AlbumStart,
    SectionPhotos,
    FolderSelect,
    ImageField,
    PhotoPickerDialog,
    VisibilitySelect
  },
  emits: ['loaded'],
  data() {
    const albumId = this.$route.params.album_id
    return {
      ICON_BUTTON:
        'rounded p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-30',
      /* A new album starts with choosing the folder on the NAS it is made from. */
      step: albumId ? 'form' : 'start',
      startedFrom: '',
      /* The folder of the photo library being browsed, shared by every picker. */
      prefix: albumId ? '' : lastStartFolder(),
      folders: [],
      error: '',
      folderError: false,
      saving: false,
      /* Saved or deleted: leaving the page is fine. */
      done: false,
      /* What was last loaded or saved, to tell whether anything changed. */
      saved: '',
      /* The section whose photos are being chosen. */
      picking: null,
      sorting: null,
      album: {
        title: '',
        date: moment().format('YYYY-MM-DD'),
        cover: '',
        folder: this.$route.query.folder || null,
        visibility: 'inherit',
        sections: [withUid({ title: 'Highlights', photos: [] })]
      }
    }
  },
  computed: {
    albumId() {
      return this.$route.params.album_id
    },
    inheritedVisibility() {
      return inheritedVisibility(this.album.folder, this.folders)
    },
    cancelTo() {
      if (this.albumId) return `/a/${this.albumId}`
      return this.album.folder ? `/f/${this.album.folder}` : '/'
    },
    total() {
      return new Set(this.album.sections.flatMap((section) => section.photos))
        .size
    },
    dirty() {
      return JSON.stringify(this.fields()) != this.saved
    }
  },
  created() {
    this.saved = JSON.stringify(this.fields())
  },
  async mounted() {
    api.get('/folders').then((response) => (this.folders = response.data))
    window.addEventListener('beforeunload', this.warnBeforeUnload)

    if (this.albumId) {
      const { _id, title, date, cover, folder, visibility, sections } = (
        await api.get(`/albums/${this.albumId}/source`)
      ).data
      this.album = {
        _id,
        title,
        date: date ? moment(date).format('YYYY-MM-DD') : '',
        cover: cover || '',
        folder,
        visibility: visibility || 'inherit',
        sections: sections.map(withUid)
      }
      /* Open the library where the album's photos are. */
      const first = cover || sections.find((s) => s.photos.length)?.photos[0]
      if (first) this.prefix = first.split('/').slice(0, -1).join('/')
    }
    this.saved = JSON.stringify(this.fields())
    this.$emit('loaded', this.album)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.warnBeforeUnload)
  },
  methods: {
    /* Only the fields of the album itself, as they are saved. */
    fields() {
      const { title, date, cover, folder, visibility, sections } = this.album
      return {
        title,
        date: date || null,
        cover,
        folder,
        visibility,
        sections: sections.map(({ _id, title, photos }) => ({
          _id,
          title,
          photos
        }))
      }
    },
    /* Whether the page may be left: asked when there are changes that were not saved. */
    mayLeave() {
      return (
        this.done ||
        !this.dirty ||
        window.confirm('Leave without saving the changes to this album?')
      )
    },
    warnBeforeUnload(event) {
      if (this.done || !this.dirty) return
      event.preventDefault()
      event.returnValue = ''
    },
    /* Enter in a field would save the whole album. */
    ignoreEnter(event) {
      if (event.target.tagName == 'INPUT') event.preventDefault()
    },
    /* Fill in the album from the folder on the NAS chosen in the first step. */
    start({ folder, title, date, photos }) {
      this.startedFrom = folder
      this.prefix = folder
      if (title) this.album.title = title
      if (date) this.album.date = date
      if (photos.length) {
        if (!this.album.sections.length)
          this.album.sections.push(withUid({ title: 'Highlights', photos: [] }))
        this.album.sections[0].photos = photos
      }
      this.step = 'form'
      this.$nextTick(() => !this.album.title && this.$refs.title.focus())
    },
    addSection() {
      const section = withUid({ title: '', photos: [] })
      this.album.sections.push(section)
      this.$nextTick(() =>
        this.$el.querySelector(`[data-section="${section.uid}"] input`).focus()
      )
    },
    moveSection(from, to) {
      const sections = this.album.sections
      sections.splice(to, 0, ...sections.splice(from, 1))
    },
    removeSection(index) {
      const section = this.album.sections[index]
      const count = section.photos.length
      if (
        count &&
        !window.confirm(
          `Delete the section "${
            section.title || 'without a title'
          }" and take its ${count} ${
            count == 1 ? 'photo' : 'photos'
          } out of the album? They stay on the NAS.`
        )
      )
        return
      this.album.sections.splice(index, 1)
    },
    async sortSection(section) {
      this.sorting = section.uid
      try {
        section.photos = sortByTaken(
          section.photos,
          await loadDates(section.photos)
        )
      } catch (e) {
        this.error = 'The dates the photos were taken could not be read.'
      } finally {
        this.sorting = null
      }
    },
    /* The photos of a section that are also in another one, with the title of that one. */
    labelsFor(section) {
      const labels = {}
      for (const other of this.album.sections) {
        if (other == section) continue
        for (const key of other.photos)
          if (!labels[key]) labels[key] = other.title || 'another section'
      }
      return labels
    },
    async submit() {
      this.folderError = !this.album.folder
      if (this.folderError) return

      this.error = ''
      this.saving = true
      try {
        const album = this.fields()
        const saved = this.albumId
          ? await api.put(`/albums/${this.albumId}`, album)
          : await api.post('/albums', album)
        this.done = true
        this.$router.push(`/a/${saved.data._id}`)
      } catch (e) {
        this.error =
          e.response?.status == 401
            ? 'The admin token is needed to save the album.'
            : 'The album could not be saved.'
      } finally {
        this.saving = false
      }
    },
    async remove() {
      if (
        !window.confirm(
          `Delete the album "${this.album.title}"? The photos stay on the NAS.`
        )
      )
        return
      try {
        await api.delete(`/albums/${this.albumId}`)
        this.done = true
        this.$router.push(this.album.folder ? `/f/${this.album.folder}` : '/')
      } catch (e) {
        this.error = 'The album could not be deleted.'
      }
    }
  },
  watch: {
    'album.folder'(folder) {
      if (folder) this.folderError = false
    }
  }
}
</script>
