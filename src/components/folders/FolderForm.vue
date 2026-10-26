<template>
  <form @submit.prevent="submit()" @keydown.enter="ignoreEnter($event)">
    <h3 class="text-lg font-medium leading-6 text-gray-900">
      {{ folderId ? 'Edit folder' : 'New folder' }}
    </h3>
    <p class="mt-1 text-sm text-gray-500">
      A folder holds other folders, albums and, if you like, loose photos.
    </p>

    <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-6">
      <div class="sm:col-span-6">
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

      <div class="sm:col-span-6">
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

      <div class="sm:col-span-4">
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
        <p v-if="parentError" class="mt-1 text-sm text-red-600">
          A folder cannot go inside itself or a folder inside it.
        </p>
        <p v-else-if="moved" class="mt-1 text-xs text-gray-500">
          Everything inside this folder moves along.
        </p>
      </div>

      <div class="sm:col-span-2">
        <label
          for="folder-sort"
          class="block text-sm font-medium text-gray-700"
        >
          Order inside
        </label>
        <select
          v-model="folder.sort"
          id="folder-sort"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
        >
          <option value="date-desc">Newest albums first</option>
          <option value="title">By title</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <VisibilitySelect
        v-model="folder.visibility"
        :inherited="inheritedVisibility"
        :top-level="!folder.parent"
        class="sm:col-span-6"
      />
    </div>

    <div class="mt-10">
      <h4 class="text-base font-medium text-gray-900">Images</h4>
      <div class="mt-4 space-y-6">
        <ImageField
          v-model="folder.cover"
          v-model:prefix="prefix"
          label="Cover"
          help="Without one, the cover of the newest album inside is used."
        />
        <LogoField
          v-model="folder.logo"
          v-model:prefix="prefix"
          :title="folder.title"
          :inherited="inheritedLogo"
        />
        <ImageField
          v-model="folder.photos"
          v-model:prefix="prefix"
          multiple
          label="Loose photos"
          help="Photos shown in this folder next to its albums."
        />
      </div>
    </div>

    <div
      class="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-gray-200 bg-white px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <div class="flex flex-wrap items-center justify-end gap-3">
        <button
          v-if="folderId"
          type="button"
          class="mr-auto text-sm font-medium text-red-600 hover:text-red-500"
          @click="remove()"
        >
          Delete folder
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
  </form>
</template>

<script>
import api from '../../api'
import {
  inheritedLogo,
  inheritedVisibility,
  subtreeIds
} from '../../utils/folders'

import FolderSelect from '../library/FolderSelect.vue'
import ImageField from '../library/ImageField.vue'
import LogoField from './LogoField.vue'
import VisibilitySelect from '../library/VisibilitySelect.vue'

export default {
  name: 'FolderForm',
  components: {
    FolderSelect,
    ImageField,
    LogoField,
    VisibilitySelect
  },
  emits: ['loaded'],
  data() {
    return {
      /* The folder of the photo library being browsed, shared by every picker. */
      prefix: '',
      folders: [],
      error: '',
      parentError: false,
      saving: false,
      /* Saved or deleted: leaving the page is fine. */
      done: false,
      /* What was last loaded, to tell whether anything changed. */
      saved: '',
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
      }
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
    inheritedLogo() {
      return inheritedLogo(this.folder.parent, this.folders)
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
    },
    dirty() {
      return JSON.stringify(this.folder) != this.saved
    }
  },
  created() {
    this.saved = JSON.stringify(this.folder)
  },
  async mounted() {
    api.get('/folders').then((response) => (this.folders = response.data))
    window.addEventListener('beforeunload', this.warnBeforeUnload)

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
    this.saved = JSON.stringify(this.folder)
    this.$emit('loaded', this.folder)
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.warnBeforeUnload)
  },
  methods: {
    /* Whether the page may be left: asked when there are changes that were not saved. */
    mayLeave() {
      return (
        this.done ||
        !this.dirty ||
        window.confirm('Leave without saving the changes to this folder?')
      )
    },
    warnBeforeUnload(event) {
      if (this.done || !this.dirty) return
      event.preventDefault()
      event.returnValue = ''
    },
    /* Enter in a field would save the whole folder. */
    ignoreEnter(event) {
      if (event.target.tagName == 'INPUT') event.preventDefault()
    },
    async submit() {
      this.error = ''
      this.parentError = false
      this.saving = true
      try {
        const saved = this.folderId
          ? await api.put(`/folders/${this.folderId}`, this.folder)
          : await api.post('/folders', this.folder)
        this.done = true
        this.$router.push(`/f/${saved.data._id}`)
      } catch (e) {
        if (e.response?.data?.error == 'invalid-parent') this.parentError = true
        else
          this.error =
            e.response?.status == 401
              ? 'The admin token is needed to save the folder.'
              : 'The folder could not be saved.'
      } finally {
        this.saving = false
      }
    },
    async remove() {
      if (!window.confirm(`Delete the folder "${this.folder.title}"?`)) return
      try {
        await api.delete(`/folders/${this.folderId}`)
        this.done = true
        this.$router.push(this.folder.parent ? `/f/${this.folder.parent}` : '/')
      } catch (e) {
        this.error =
          e.response?.status == 409
            ? 'Only an empty folder can be deleted. Move or delete what is inside first.'
            : 'The folder could not be deleted.'
      }
    }
  },
  watch: {
    'folder.parent'() {
      this.parentError = false
    }
  }
}
</script>
