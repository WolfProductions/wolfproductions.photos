<template>
  <form @submit.prevent="submit()" class="space-y-8 divide-y divide-gray-200">
    <div>
      <h3 class="text-lg font-medium leading-6 text-gray-900">
        {{ folderId ? 'Edit folder' : 'New folder' }}
      </h3>
      <p class="mt-1 text-sm text-gray-500">
        A folder holds other folders, albums and, if you like, loose photos.
      </p>

      <div class="mt-6 flex flex-col space-y-6">
        <div>
          <label
            for="folder-title"
            class="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            v-model="folder.title"
            type="text"
            id="folder-title"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>

        <div>
          <label
            for="folder-description"
            class="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            v-model="folder.description"
            id="folder-description"
            rows="2"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            Inside folder
          </label>
          <div class="mt-1">
            <FolderSelect
              v-model="folder.parent"
              :options="folders"
              :excluded="excluded"
              allow-top
            />
          </div>
          <p v-if="moved" class="mt-1 text-xs text-gray-500">
            Everything inside this folder moves along.
          </p>
        </div>

        <VisibilitySelect
          v-model="folder.visibility"
          :inherited="inheritedVisibility"
          :top-level="!folder.parent"
        />

        <div>
          <label
            for="folder-sort"
            class="block text-sm font-medium text-gray-700"
          >
            Order of the albums
          </label>
          <select
            v-model="folder.sort"
            id="folder-sort"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
          >
            <option value="date-desc">Newest first</option>
            <option value="title">By title</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <ImageField
          v-for="field in pickers"
          :key="field.name"
          v-model="folder[field.name]"
          v-model:prefix="prefix"
          :multiple="field.name == 'photos'"
          :label="field.label"
          :help="field.help"
        />
      </div>
    </div>

    <div class="pt-5">
      <div class="flex items-center justify-end">
        <button
          v-if="folderId"
          type="button"
          class="mr-auto text-sm font-medium text-red-600 hover:text-red-500"
          @click="remove()"
        >
          Delete folder
        </button>
        <p v-if="error" class="mr-3 text-sm text-red-600">{{ error }}</p>
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
import { inheritedVisibility, subtreeIds } from '../../utils/folders'

import FolderSelect from '../library/FolderSelect.vue'
import ImageField from '../library/ImageField.vue'
import VisibilitySelect from '../library/VisibilitySelect.vue'

export default {
  name: 'FolderForm',
  components: {
    FolderSelect,
    ImageField,
    VisibilitySelect
  },
  emits: ['loaded'],
  data() {
    return {
      /* The folder of the photo library being browsed, shared by every picker. */
      prefix: '',
      folders: [],
      error: '',
      saving: false,
      originalParent: null,
      folder: {
        title: '',
        description: '',
        parent: this.$route.query.parent || null,
        visibility: 'inherit',
        sort: 'date-desc',
        cover: '',
        logo: '',
        photos: []
      },
      pickers: [
        {
          name: 'cover',
          label: 'Cover',
          help: 'Without one, the cover of the newest album inside is used.'
        },
        {
          name: 'logo',
          label: 'Logo',
          help: 'Shown in the top bar here and in everything inside, unless that has its own.'
        },
        {
          name: 'photos',
          label: 'Loose photos',
          help: 'Photos shown in this folder next to its albums.'
        }
      ]
    }
  },
  computed: {
    folderId() {
      return this.$route.params.folder_id
    },
    excluded() {
      return this.folderId ? subtreeIds(this.folderId, this.folders) : new Set()
    },
    inheritedVisibility() {
      return inheritedVisibility(this.folder.parent, this.folders)
    },
    moved() {
      return (
        this.folderId &&
        String(this.folder.parent || '') != String(this.originalParent || '')
      )
    },
    cancelTo() {
      if (this.folderId) return `/f/${this.folderId}`
      return this.folder.parent ? `/f/${this.folder.parent}` : '/'
    }
  },
  async mounted() {
    api.get('/folders').then((response) => (this.folders = response.data))

    if (this.folderId) {
      const data = (await api.get(`/folders/${this.folderId}/source`)).data
      this.folder = {
        title: data.title,
        description: data.description || '',
        parent: data.parent,
        visibility: data.visibility || 'inherit',
        sort: data.sort || 'date-desc',
        cover: data.cover || '',
        logo: data.logo || '',
        photos: data.photos || []
      }
      this.originalParent = data.parent
      /* Open the library where the folder's photos are. */
      const first = this.folder.cover || this.folder.photos[0]
      if (first) this.prefix = first.split('/').slice(0, -1).join('/')
    }
    this.$emit('loaded', this.folder)
  },
  methods: {
    async submit() {
      this.error = ''
      this.saving = true
      try {
        const saved = this.folderId
          ? await api.put(`/folders/${this.folderId}`, this.folder)
          : await api.post('/folders', this.folder)
        this.$router.push(`/f/${saved.data._id}`)
      } catch (e) {
        this.error =
          e.response?.status == 401
            ? 'The admin token is needed to save the folder.'
            : e.response?.data?.error == 'invalid-parent'
            ? 'A folder cannot go inside itself.'
            : 'The folder could not be saved.'
      } finally {
        this.saving = false
      }
    },
    async remove() {
      if (!window.confirm(`Delete the folder "${this.folder.title}"?`)) return
      try {
        await api.delete(`/folders/${this.folderId}`)
        this.$router.push(this.folder.parent ? `/f/${this.folder.parent}` : '/')
      } catch (e) {
        this.error =
          e.response?.status == 409
            ? 'Only an empty folder can be deleted. Move or delete what is inside first.'
            : 'The folder could not be deleted.'
      }
    }
  }
}
</script>
