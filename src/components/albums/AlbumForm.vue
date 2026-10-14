<template>
  <form @submit.prevent="submit()" class="space-y-8 divide-y divide-gray-200">
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-lg font-medium leading-6 text-gray-900">
            {{ albumId ? 'Edit album' : 'New album' }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{
              albumId
                ? 'Change the information to edit the album.'
                : 'Fill in the information to create a new album.'
            }}
          </p>
        </div>

        <div class="mt-6 flex flex-col space-y-6">
          <div>
            <label
              for="album-title"
              class="block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <div class="mt-1">
              <input
                v-model="album.title"
                type="text"
                id="album-title"
                required
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              for="album-date"
              class="block text-sm font-medium text-gray-700"
            >
              Date
            </label>
            <div class="mt-1">
              <input
                v-model="album.date"
                type="date"
                id="album-date"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              Folder
            </label>
            <div class="mt-1">
              <FolderSelect v-model="album.folder" :options="folders" />
            </div>
          </div>

          <VisibilitySelect
            v-model="album.visibility"
            :inherited="inheritedVisibility"
          />

          <div>
            <label class="block text-sm font-medium text-gray-700">
              Cover
            </label>
            <div class="mt-1 w-full">
              <Disclosure v-slot="{ open }">
                <DisclosureButton
                  class="flex w-full justify-between rounded-lg bg-red-100 px-4 py-2 text-left text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
                >
                  <span class="truncate">{{
                    album.cover || 'Cover picture'
                  }}</span>
                  <ChevronUpIcon
                    :class="open ? 'rotate-180 transform' : ''"
                    class="h-5 w-5 flex-shrink-0 text-red-500"
                  />
                </DisclosureButton>
                <DisclosurePanel class="px-4 py-4">
                  <LibraryPicker
                    v-model="album.cover"
                    :files="files"
                    :prefix="prefix"
                    @open="prefix = $event"
                  />
                </DisclosurePanel>
              </Disclosure>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              Sections
            </label>
            <div class="mt-1 flex w-full flex-col space-y-2">
              <Disclosure
                v-slot="{ open }"
                v-for="(section, index) in album.sections"
                :key="section"
              >
                <DisclosureButton
                  class="flex w-full justify-between rounded-lg bg-red-100 px-4 py-2 text-left text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
                >
                  <span
                    >{{ section.title }}
                    <span class="font-normal text-red-700"
                      >· {{ section.photos.length }} photos</span
                    ></span
                  >
                  <div class="flex space-x-4">
                    <TrashIcon
                      @click.stop="removeSection(index)"
                      :class="{ hidden: !open }"
                      class="h-5 w-5 text-red-500"
                    />
                    <ChevronUpIcon
                      :class="open ? 'rotate-180 transform' : ''"
                      class="h-5 w-5 text-red-500"
                    />
                  </div>
                </DisclosureButton>
                <DisclosurePanel class="px-4 py-2 text-sm text-gray-500">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">
                      Section title
                    </label>
                    <div class="mt-1">
                      <input
                        v-model="section.title"
                        type="text"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700">
                      Section photos
                    </label>
                    <div class="mt-1">
                      <LibraryPicker
                        v-model="section.photos"
                        multiple
                        :files="files"
                        :prefix="prefix"
                        @open="prefix = $event"
                      />
                    </div>
                  </div>
                </DisclosurePanel>
              </Disclosure>
            </div>
            <button
              @click.prevent="album.sections.push({ title: 'new', photos: [] })"
              class="mt-3 inline-flex justify-center rounded-md border border-transparent bg-red-600 py-1.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Add section
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pt-5">
      <div class="flex items-center justify-end">
        <button
          v-if="albumId"
          type="button"
          class="mr-auto text-sm font-medium text-red-600 hover:text-red-500"
          @click="remove()"
        >
          Delete album
        </button>
        <p v-if="error" class="mr-3 text-sm text-red-600">
          {{ error }}
        </p>
        <router-link
          :to="cancelTo"
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
import moment from 'moment'
import { inheritedVisibility } from '../../utils/folders'
import { loadLibrary, libraryError } from '../../utils/library'

import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { ChevronUpIcon, TrashIcon } from '@heroicons/vue/solid'

import FolderSelect from '../library/FolderSelect.vue'
import LibraryPicker from '../library/LibraryPicker.vue'
import VisibilitySelect from '../library/VisibilitySelect.vue'

export default {
  name: 'AlbumForm',
  components: {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    ChevronUpIcon,
    TrashIcon,
    FolderSelect,
    LibraryPicker,
    VisibilitySelect
  },
  emits: ['loaded'],
  data() {
    return {
      files: [],
      /* The folder of the photo library being browsed, shared by every picker. */
      prefix: '',
      folders: [],
      error: '',
      saving: false,
      album: {
        title: '',
        date: moment().format('YYYY-MM-DD'),
        cover: '',
        folder: this.$route.query.folder || null,
        visibility: 'inherit',
        sections: [
          {
            title: 'Highlights',
            photos: []
          }
        ]
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
    }
  },
  async mounted() {
    this.updateFiles()
    api.get('/folders').then((response) => (this.folders = response.data))

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
        sections
      }
      /* Open the library where the album's photos are. */
      const first = cover || sections.find((s) => s.photos.length)?.photos[0]
      if (first) this.prefix = first.split('/').slice(0, -1).join('/')
    }
    this.$emit('loaded', this.album)
  },
  methods: {
    removeSection(index) {
      this.album.sections.splice(index, 1)
    },
    async updateFiles() {
      const prefix = this.prefix
      try {
        const files = await loadLibrary(prefix)
        // Another folder was opened while this one was loading
        if (prefix != this.prefix) return
        this.files = files
        this.error = ''
      } catch (e) {
        this.error = libraryError(e)
      }
    },
    async submit() {
      if (!this.album.folder) return (this.error = 'Choose a folder.')

      // Only the fields of the album itself
      const { title, date, cover, folder, visibility, sections } = this.album
      const album = {
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

      this.error = ''
      this.saving = true
      try {
        const saved = this.albumId
          ? await api.put(`/albums/${this.albumId}`, album)
          : await api.post('/albums', album)
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
        this.$router.push(this.album.folder ? `/f/${this.album.folder}` : '/')
      } catch (e) {
        this.error = 'The album could not be deleted.'
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
