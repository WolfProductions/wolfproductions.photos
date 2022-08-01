<template>
  <form @submit.prevent="submit()" class="space-y-8 divide-y divide-gray-200">
    <div class="space-y-8 divide-y divide-gray-200">
      <div>
        <div>
          <h3 class="text-lg font-medium leading-6 text-gray-900">
            {{ $route.params.album_id ? 'Edit Album' : 'New Album' }}
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            {{
              $route.params.album_id
                ? 'Change the information to edit the album'
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
                name="album-title"
                id="album-title"
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
                name="album-date"
                id="album-date"
                autocomplete="family-name"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              for="album-sections"
              class="block text-sm font-medium text-gray-700"
            >
              Cover
            </label>
            <div class="mt-1 w-full">
              <div
                class="mx-auto flex w-full flex-col space-y-2 rounded-2xl bg-white"
              >
                <Disclosure v-slot="{ open }">
                  <DisclosureButton
                    class="flex w-full justify-between rounded-lg bg-red-100 px-4 py-2 text-left text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
                  >
                    <span>{{ album.cover || 'Cover picture' }}</span>
                    <div class="flex space-x-4">
                      <ChevronUpIcon
                        :class="open ? 'rotate-180 transform' : ''"
                        class="h-5 w-5 text-red-500"
                      />
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel class="px-4 py-2 text-sm text-gray-500">
                    <div class="mt-4">
                      <label
                        for="section-files"
                        class="block text-sm font-medium text-gray-700"
                      >
                        Cover photo
                      </label>
                      <div class="mt-1 flex flex-col">
                        <div
                          class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8"
                        >
                          <div
                            class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"
                          >
                            <div
                              class="relative overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
                            >
                              <table
                                class="min-w-full table-fixed divide-y divide-gray-300"
                              >
                                <thead class="bg-gray-50">
                                  <tr>
                                    <th
                                      scope="col"
                                      class="relative w-12 px-6 sm:w-16 sm:px-8"
                                    ></th>
                                    <th
                                      scope="col"
                                      class="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                                    >
                                      {{ this.prefix || '/' }}
                                    </th>
                                  </tr>
                                </thead>
                                <RadioGroup
                                  v-model="album.cover"
                                  as="tbody"
                                  class="cursor-pointer divide-y divide-gray-200 bg-white"
                                >
                                  <RadioGroupOption
                                    as="tr"
                                    :disabled="file.type == 'folder'"
                                    v-slot="{ checked }"
                                    :value="file.key"
                                    v-for="file in files"
                                    :key="file.name"
                                    :class="[checked && 'bg-gray-50']"
                                  >
                                    <td
                                      class="relative w-12 px-6 sm:w-16 sm:px-8"
                                    >
                                      <div
                                        v-if="checked"
                                        class="absolute inset-y-0 left-0 w-0.5 bg-red-600"
                                      ></div>
                                      <CheckIcon
                                        v-if="
                                          file.key == album.cover &&
                                          album.cover != ''
                                        "
                                        class="h-5 w-5 text-red-500"
                                      />
                                    </td>
                                    <td
                                      :class="[
                                        'flex space-x-2 whitespace-nowrap py-1 pr-3 text-sm font-medium',
                                        checked
                                          ? 'text-red-600'
                                          : 'text-gray-900'
                                      ]"
                                    >
                                      <FolderIcon
                                        v-if="file.type == 'folder'"
                                        class="h-5 w-5 text-gray-500"
                                      />
                                      <span
                                        v-if="file.type == 'folder'"
                                        @click="prefix = file.key"
                                        class="cursor-pointer hover:underline"
                                        >{{ file.name }}</span
                                      >
                                      <div
                                        v-else
                                        class="flex items-center space-x-2"
                                      >
                                        <span>{{ file.name }}</span>
                                      </div>
                                    </td>
                                  </RadioGroupOption>
                                </RadioGroup>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DisclosurePanel>
                </Disclosure>
              </div>
            </div>
          </div>

          <div>
            <label
              for="album-sections"
              class="block text-sm font-medium text-gray-700"
            >
              Sections
            </label>
            <div class="mt-1 w-full">
              <div
                class="mx-auto flex w-full flex-col space-y-2 rounded-2xl bg-white"
              >
                <Disclosure
                  v-slot="{ open }"
                  v-for="(section, index) in album.sections"
                  :key="section"
                >
                  <DisclosureButton
                    class="flex w-full justify-between rounded-lg bg-red-100 px-4 py-2 text-left text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring focus-visible:ring-red-500 focus-visible:ring-opacity-75"
                  >
                    <span>{{ section.title }}</span>
                    <div class="flex space-x-4">
                      <TrashIcon
                        @click="removeSection(index)"
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
                      <label
                        for="section-title"
                        class="block text-sm font-medium text-gray-700"
                      >
                        Section title
                      </label>
                      <div class="mt-1">
                        <input
                          v-model="section.title"
                          type="text"
                          name="section-title"
                          id="section-title"
                          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div class="mt-4">
                      <label
                        for="section-files"
                        class="block text-sm font-medium text-gray-700"
                      >
                        Section photos
                      </label>
                      <div class="mt-1 flex flex-col">
                        <div
                          class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8"
                        >
                          <div
                            class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8"
                          >
                            <div
                              class="relative overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg"
                            >
                              <table
                                class="min-w-full table-fixed divide-y divide-gray-300"
                              >
                                <thead class="bg-gray-50">
                                  <tr>
                                    <th
                                      scope="col"
                                      class="relative w-12 px-6 sm:w-16 sm:px-8"
                                    >
                                      <input
                                        v-if="
                                          files.filter((f) => f.type == 'file')
                                            .length != 0
                                        "
                                        type="checkbox"
                                        class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 sm:left-6"
                                        :checked="
                                          (section.photos.length > 0 &&
                                            section.photos.length <
                                              files.filter(
                                                (f) => f.type == 'file'
                                              ).length) ||
                                          section.photos.length ===
                                            files.filter(
                                              (f) => f.type == 'file'
                                            ).length
                                        "
                                        :indeterminate="
                                          section.photos.length > 0 &&
                                          section.photos.length <
                                            files.filter(
                                              (f) => f.type == 'file'
                                            ).length
                                        "
                                        @change="
                                          section.photos = $event.target.checked
                                            ? files
                                                .filter((f) => f.type == 'file')
                                                .map((p) => p.key)
                                            : []
                                        "
                                      />
                                    </th>
                                    <th
                                      scope="col"
                                      class="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                                    >
                                      {{ this.prefix || '/' }}
                                    </th>
                                    <th
                                      scope="col"
                                      class="min-w-[12rem] py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                                    >
                                      Date Created
                                    </th>
                                  </tr>
                                </thead>
                                <tbody
                                  class="divide-y divide-gray-200 bg-white"
                                >
                                  <tr
                                    v-for="file in files"
                                    :key="file.name"
                                  >
                                    <td
                                      class="relative w-12 px-6 sm:w-16 sm:px-8"
                                    >
                                      <div
                                        v-if="section.photos.includes(file.key)"
                                        class="absolute inset-y-0 left-0 w-0.5 bg-red-600"
                                      ></div>
                                      <input
                                        v-if="file.type == 'file'"
                                        type="checkbox"
                                        class="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500 sm:left-6"
                                        :value="file.key"
                                        v-model="section.photos"
                                        @click.exact="lastSelected = file"
                                        @click.shift="
                                          multipleSelect(section, file)
                                        "
                                      />
                                    </td>
                                    <td
                                      :class="[
                                        'flex items-center space-x-2 whitespace-nowrap py-1 pr-3 text-sm font-medium',
                                        section.photos.includes(file.key)
                                          ? 'text-red-600'
                                          : 'text-gray-900'
                                      ]"
                                    >
                                      <FolderIcon
                                        v-if="file.type == 'folder'"
                                        class="h-8 w-8 text-gray-500"
                                      />
                                      <span
                                        v-if="file.type == 'folder'"
                                        @click="prefix = file.key"
                                        class="cursor-pointer hover:underline"
                                        >{{ file.name }}</span
                                      >
                                      <div
                                        v-else
                                        class="flex items-center space-x-2"
                                      >
                                        <!-- <img
                                          :src="getPhotoUrl(file.key)"
                                          alt=""
                                          class="h-8 w-8 rounded object-cover"
                                        /> -->
                                        <span>{{ file.name }}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span class="text-sm font-medium">
                                        {{ file.created != 1000 ? moment(file.created * 1000) : '-' }}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DisclosurePanel>
                </Disclosure>
              </div>
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
      <div class="flex justify-end">
        <router-link
          :to="`/${$route.params.organisation_id}`"
          type="button"
          class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >Cancel</router-link
        >
        <button
          type="submit"
          class="ml-3 inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Save
        </button>
      </div>
    </div>
  </form>
</template>

<script>
import axios from 'axios'
import moment from 'moment'

import { create as exif } from 'exif-parser'

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  RadioGroup,
  RadioGroupOption
} from '@headlessui/vue'
import {
  CheckIcon,
  ChevronUpIcon,
  FolderIcon,
  TrashIcon
} from '@heroicons/vue/solid'

export default {
  name: 'AlbumForm',
  components: {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    RadioGroup,
    RadioGroupOption,
    CheckIcon,
    ChevronUpIcon,
    FolderIcon,
    TrashIcon
  },
  data() {
    return {
      s3Client: null,
      moment,
      files: [],
      result: null,
      prefix: '',
      checked: null,
      lastSelected: null,
      album: {
        title: '',
        date: '',
        cover: '',
        sections: [
          {
            title: 'Highlights',
            photos: []
          }
        ]
      }
    }
  },
  async mounted() {
    const client = new CognitoIdentityClient({ region: 'eu-central-1' })

    this.s3Client = await new S3Client({
      region: 'eu-west-1',
      credentials: fromCognitoIdentityPool({
        client,
        identityPoolId: 'eu-central-1:c2ef2934-6b93-49b5-8c3f-95510de1b38e'
      })
    })

    this.updateFiles()

    if (this.$route.params.album_id) {
      const response = await axios.get(
        `https://wolfproductions.photos/api/album/${this.$route.params.album_id}`
      )
      response.data.date = moment(response.data.date).format('YYYY-MM-DD')
      this.album = response.data
    }
  },
  methods: {
    getPhotoUrl(key, width) {
      if (!key) return ''
      const bucketName = 'wolfproductions.photos'
      const CloudFrontUrl = 'https://d1b892w88fzt8v.cloudfront.net'

      const imageRequest = JSON.stringify({
        bucket: bucketName,
        key: key,
        edits: {
          resize: {
            width: width || 32
          }
        }
      })

      return `${CloudFrontUrl}/${btoa(imageRequest)}`

      // return `https://s3.eu-west-1.amazonaws.com/wolfproductions.photos/${key}`
    },
    async removeSection(index) {
      this.album.sections.splice(index, 1)
    },
    async updateFiles() {
      let folders = []
      let files = []
      let currentResults = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: 'wolfproductions.photos',
          Prefix: this.prefix,
          Delimiter: '/'
        })
      )
      
      let results = currentResults
      
      while (currentResults.NextContinuationToken) {
        currentResults = await this.s3Client.send(
          new ListObjectsV2Command({
            Bucket: 'wolfproductions.photos',
            Prefix: this.prefix,
            Delimiter: '/',
            ContinuationToken: currentResults.NextContinuationToken
          })
        )
        results.Contents.push(...currentResults.Contents)
      }

      this.result = results

      if (results.CommonPrefixes)
        folders.push(
          ...results.CommonPrefixes.map((prefix) => {
            return {
              key: prefix.Prefix,
              name: prefix.Prefix,
              type: 'folder'
            }
          })
        )

      if (results.Contents) {
        files.push(
          ...results.Contents.map((file) => {
            const type =
              file.Key.replace(this.prefix, '') == '' ? 'folder' : 'file'
            if (type == 'folder')
              file.Key = file.Key.substring(0, file.Key.length - 2)
            if (type == 'folder')
              file.Key = file.Key.substring(0, file.Key.lastIndexOf('/')) + '/'
            if (file.Key == '/') file.Key = ''
            return {
              key: file.Key,
              name: type == 'folder' ? '..' : file.Key.replace(this.prefix, ''),
              type: type
            }
          })
        )

        files = await Promise.all(files.map(async (file) => {
          if (file.type == 'folder') return {
            key: file.key,
            name: file.name,
            type: file.type,
            created: 1000
          }

          try {
            const image = await axios.get(this.getPhotoUrl(file.key), { responseType: 'arraybuffer' })
            const data = exif(image.data).parse()
  
            return {
              key: file.key,
              name: file.name,
              type: file.type,
              created: data.tags.CreateDate
            }
          } catch (e) {
            return {
              key: file.key,
              name: file.name,
              type: file.type,
              created: 1000
            }
          }
        }))
      }


      files = files.sort((a, b) => a.created - b.created)
      folders = folders.sort((a, b) => a.name.localeCompare(b.name))

      this.files = [...folders, ...files]
    },
    submit() {
      if (this.$route.params.album_id) {
        axios.put(
          `https://wolfproductions.photos/api/album/${this.$route.params.album_id}`,
          this.album
        )
        this.$router.push(
          `/${this.$route.params.organisation_id}/${this.$route.params.album_id}`
        )
      } else {
        axios.post(
          `https://wolfproductions.photos/api/organisations/${this.$route.params.organisation_id}/albums`,
          this.album
        )
        this.$router.push(`/${this.$route.params.organisation_id}`)
      }
    },
    multipleSelect(section, file) {
      if (!this.lastSelected) return

      let startIndex = this.files.findIndex(
        (photo) => photo.key == this.lastSelected.key
      )
      let endIndex = this.files.findIndex((photo) => photo.key == file.key)
      if (startIndex > endIndex) {
        let temp = startIndex
        startIndex = endIndex
        endIndex = temp
      }

      for (let i = startIndex + 1; i <= endIndex; i++) {
        section.photos.push(this.files[i].key)
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
