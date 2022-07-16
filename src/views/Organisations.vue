<template>
  <!--
    This example requires updating your template:

    ```
    <html class="h-full bg-white">
    <body class="h-full">
    ```
  -->
  <div class="flex min-h-full">
    <TransitionRoot as="template" :show="sidebarOpen">
      <Dialog
        as="div"
        class="relative z-40 lg:hidden"
        @close="sidebarOpen = false"
      >
        <TransitionChild
          as="template"
          enter="transition-opacity ease-linear duration-300"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </TransitionChild>

        <div class="fixed inset-0 z-40 flex">
          <TransitionChild
            as="template"
            enter="transition ease-in-out duration-300 transform"
            enter-from="-translate-x-full"
            enter-to="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leave-from="translate-x-0"
            leave-to="-translate-x-full"
          >
            <DialogPanel
              class="relative flex w-full max-w-xs flex-1 flex-col bg-gray-800 pt-5 pb-4"
            >
              <TransitionChild
                as="template"
                enter="ease-in-out duration-300"
                enter-from="opacity-0"
                enter-to="opacity-100"
                leave="ease-in-out duration-300"
                leave-from="opacity-100"
                leave-to="opacity-0"
              >
                <div class="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    class="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    @click="sidebarOpen = false"
                  >
                    <span class="sr-only">Close sidebar</span>
                    <XIcon class="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </TransitionChild>
              <div class="flex flex-shrink-0 items-center px-4">
                <img class="h-8 w-auto" :src="Logo" alt="Workflow" />
              </div>
              <div class="mt-5 h-0 flex-1 overflow-y-auto">
                <nav class="px-2">
                  <div class="space-y-1">
                    <a
                      v-for="item in navigation"
                      :key="item.name"
                      :href="item.href"
                      :class="[
                        item.current
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'group flex items-center rounded-md px-2 py-2 text-base font-medium'
                      ]"
                      :aria-current="item.current ? 'page' : undefined"
                    >
                      <component
                        :is="item.icon"
                        :class="[
                          item.current
                            ? 'text-gray-300'
                            : 'text-gray-400 group-hover:text-gray-300',
                          'mr-4 h-6 w-6 flex-shrink-0'
                        ]"
                        aria-hidden="true"
                      />
                      {{ item.name }}
                    </a>
                  </div>
                  <div class="mt-10">
                    <p
                      class="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400"
                    >
                      Projects
                    </p>
                    <div class="mt-2 space-y-1">
                      <a
                        v-for="project in projects"
                        :key="project.id"
                        :href="project.href"
                        class="flex items-center rounded-md px-2 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <span class="truncate">{{ project.name }}</span>
                      </a>
                    </div>
                  </div>
                </nav>
              </div>
            </DialogPanel>
          </TransitionChild>
          <div class="w-14 flex-shrink-0" aria-hidden="true">
            <!-- Dummy element to force sidebar to shrink to fit close icon -->
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Static sidebar for desktop -->
    <div class="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
      <!-- Sidebar component, swap this element with another sidebar if you like -->
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="flex h-16 flex-shrink-0 items-center bg-gray-900 px-4">
          <img class="h-8 w-auto" :src="Logo" alt="Workflow" />
        </div>
        <div class="flex flex-1 flex-col overflow-y-auto bg-gray-800">
          <nav class="flex-1 px-2 py-4">
            <div class="space-y-1">
              <a
                v-for="item in navigation"
                :key="item.name"
                :href="item.href"
                :class="[
                  item.current
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                ]"
                :aria-current="item.current ? 'page' : undefined"
              >
                <component
                  :is="item.icon"
                  :class="[
                    item.current
                      ? 'text-gray-300'
                      : 'text-gray-400 group-hover:text-gray-300',
                    'mr-3 h-6 w-6 flex-shrink-0'
                  ]"
                  aria-hidden="true"
                />
                {{ item.name }}
              </a>
            </div>
            <div class="mt-10">
              <p
                class="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                Projects
              </p>
              <div class="mt-2 space-y-1">
                <a
                  v-for="project in projects"
                  :key="project.id"
                  :href="project.href"
                  class="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <span class="truncate">
                    {{ project.name }}
                  </span>
                </a>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
    <div class="flex w-0 flex-1 flex-col lg:pl-64">
      <div
        class="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white"
      >
        <button
          type="button"
          class="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900 lg:hidden"
          @click="sidebarOpen = true"
        >
          <span class="sr-only">Open sidebar</span>
          <MenuAlt2Icon class="h-6 w-6" aria-hidden="true" />
        </button>
        <div class="flex flex-1 justify-between px-4">
          <div class="flex flex-1">
            <form class="flex w-full lg:ml-0" action="#" method="GET">
              <label for="search-field" class="sr-only">Search</label>
              <div
                class="relative w-full text-gray-400 focus-within:text-gray-600"
              >
                <div
                  class="pointer-events-none absolute inset-y-0 left-0 flex items-center"
                >
                  <SearchIcon class="h-5 w-5" aria-hidden="true" />
                </div>
                <input
                  id="search-field"
                  class="block h-full w-full border-transparent py-2 pl-8 pr-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:placeholder-gray-400 focus:outline-none focus:ring-0 sm:text-sm"
                  placeholder="Search"
                  type="search"
                  name="search"
                />
              </div>
            </form>
          </div>
          <div class="ml-4 flex items-center lg:ml-6">
            <button
              type="button"
              class="inline-flex items-center rounded-md border border-transparent bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              Create
            </button>
          </div>
        </div>
      </div>

      <main class="flex-1">
        <div class="py-8 xl:py-10">
          <div class="mx-auto px-4 sm:px-6 lg:px-8">
            <OrganisationsList />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import {
  Dialog,
  DialogPanel,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import {
  ArchiveIcon,
  ClockIcon,
  HomeIcon,
  MenuAlt2Icon,
  UserCircleIcon as UserCircleIconOutline,
  ViewListIcon,
  XIcon
} from '@heroicons/vue/outline'
import {
  BellIcon,
  CalendarIcon,
  ChatAltIcon,
  CheckCircleIcon,
  LockOpenIcon,
  PencilIcon,
  SearchIcon,
  TagIcon,
  UserCircleIcon as UserCircleIconSolid
} from '@heroicons/vue/solid'

import OrganisationsList from '../components/organisations/OrganisationsList.vue'
import Logo from '../assets/white_text.svg'

const navigation = [
  { name: 'All Issues', href: '#', icon: HomeIcon, current: true },
  { name: 'My Issues', href: '#', icon: ViewListIcon, current: false },
  { name: 'Assigned', href: '#', icon: UserCircleIconOutline, current: false },
  { name: 'Closed', href: '#', icon: ArchiveIcon, current: false },
  { name: 'Recent', href: '#', icon: ClockIcon, current: false }
]
const projects = [
  { id: 1, name: 'GraphQL API', href: '#' },
  { id: 2, name: 'iOS App', href: '#' },
  { id: 3, name: 'Marketing Site Redesign', href: '#' },
  { id: 4, name: 'Customer Portal', href: '#' }
]
const activity = [
  {
    id: 1,
    type: 'comment',
    person: { name: 'Eduardo Benz', href: '#' },
    imageUrl:
      'https://images.unsplash.com/photo-1520785643438-5bf77931f493?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
    comment:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. ',
    date: '6d ago'
  },
  {
    id: 2,
    type: 'assignment',
    person: { name: 'Hilary Mahy', href: '#' },
    assigned: { name: 'Kristin Watson', href: '#' },
    date: '2d ago'
  },
  {
    id: 3,
    type: 'tags',
    person: { name: 'Hilary Mahy', href: '#' },
    tags: [
      { name: 'Bug', href: '#', color: 'bg-rose-500' },
      { name: 'Accessibility', href: '#', color: 'bg-indigo-500' }
    ],
    date: '6h ago'
  },
  {
    id: 4,
    type: 'comment',
    person: { name: 'Jason Meyers', href: '#' },
    imageUrl:
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80',
    comment:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Tincidunt nunc ipsum tempor purus vitae id. Morbi in vestibulum nec varius. Et diam cursus quis sed purus nam. Scelerisque amet elit non sit ut tincidunt condimentum. Nisl ultrices eu venenatis diam.',
    date: '2h ago'
  }
]

const sidebarOpen = ref(false)

export default {
  name: 'Organisations',
  components: {
    Dialog,
    DialogPanel,
    TransitionChild,
    TransitionRoot,
    SearchIcon,
    XIcon,
    MenuAlt2Icon,
    OrganisationsList
  },
  setup() {
    return {
      sidebarOpen,
      navigation,
      projects,
      activity,
      Logo
    }
  }
}
</script>
