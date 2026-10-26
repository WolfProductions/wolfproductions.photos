<template>
  <div
    class="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8"
  >
    <router-link to="/" class="flex-shrink-0">
      <img
        :src="logo ? getPhotoUrl(logo) : Logo"
        class="h-8 w-auto max-w-[10rem] object-contain"
        alt="Home"
      />
    </router-link>

    <nav
      v-if="breadcrumb.length || current"
      class="ml-4 flex min-w-0 flex-1 items-center overflow-hidden border-l border-gray-200 pl-4 text-sm"
      aria-label="Breadcrumb"
    >
      <template v-for="folder in breadcrumb" :key="folder._id">
        <router-link
          :to="`/f/${folder._id}`"
          class="hidden truncate text-gray-500 hover:text-gray-700 sm:block"
          >{{ folder.title }}</router-link
        >
        <ChevronRightIcon
          class="mx-1 hidden h-5 w-5 flex-shrink-0 text-gray-400 sm:block"
        />
      </template>
      <span class="truncate font-medium text-gray-900">{{ current }}</span>
    </nav>
    <div v-else class="flex-1" />

    <div class="ml-4 flex flex-shrink-0 items-center space-x-3">
      <ProcessingStatus v-if="session.admin" />
      <slot v-if="session.admin" />
      <button
        type="button"
        class="text-sm text-gray-400 hover:text-gray-600"
        @click="session.admin ? logout() : login()"
      >
        <LogoutIcon v-if="session.admin" class="h-5 w-5" />
        <LoginIcon v-else class="h-5 w-5" />
        <span class="sr-only">{{ session.admin ? 'Log out' : 'Log in' }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ChevronRightIcon, LoginIcon, LogoutIcon } from '@heroicons/vue/solid'

import { session, login, logout } from '../../session'
import { getPhotoUrl } from '../../utils/photos'
import Logo from '../../assets/dark_text.svg'

import ProcessingStatus from './ProcessingStatus.vue'

export default {
  name: 'TopBar',
  components: { ChevronRightIcon, LoginIcon, LogoutIcon, ProcessingStatus },
  props: {
    logo: { type: String, default: '' },
    breadcrumb: { type: Array, default: () => [] },
    current: { type: String, default: '' }
  },
  data: () => ({ session, Logo }),
  methods: { getPhotoUrl, login, logout }
}
</script>
