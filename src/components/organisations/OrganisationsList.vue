<template>
  <ul
    role="list"
    class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:gap-x-8"
  >
    <li
      v-for="organisation in organisations"
      :key="organisation"
      class="relative"
    >
      <div
        class="group aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
      >
        <img
          :src="getPhotoUrl(organisation.cover, 'medium')"
          alt=""
          class="pointer-events-none object-cover group-hover:opacity-75"
        />
        <router-link
          :to="`/${organisation._id}`"
          type="button"
          class="absolute inset-0 focus:outline-none"
        >
          <span class="sr-only">View details for {{ organisation.title }}</span>
        </router-link>
      </div>
      <p
        class="pointer-events-none mt-2 block truncate text-sm font-medium text-gray-900"
      >
        {{ organisation.title }}
      </p>
    </li>
  </ul>
</template>

<script>
import api from '../../api'
import { getPhotoUrl } from '../../utils/photos'

export default {
  name: 'OrganisationsList',
  data() {
    return {
      organisations: []
    }
  },
  async mounted() {
    // Get the list of organisations
    api.get('/organisations').then((reponse) => {
      this.organisations = reponse.data
    })
  },
  methods: {
    getPhotoUrl
  }
}
</script>
