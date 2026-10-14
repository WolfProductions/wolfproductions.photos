import { createRouter, createWebHistory } from 'vue-router'

/* A Mongo ObjectId, so the old links below only match what can be an id. */
const ID = '([0-9a-f]{24})'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/f/new',
      component: () => import('../views/FolderEdit.vue')
    },
    {
      path: `/f/:folder_id${ID}`,
      component: () => import('../views/Folder.vue')
    },
    {
      path: `/f/:folder_id${ID}/edit`,
      component: () => import('../views/FolderEdit.vue')
    },
    {
      path: '/a/new',
      component: () => import('../views/AlbumEdit.vue')
    },
    {
      path: `/a/:album_id${ID}`,
      component: () => import('../views/Gallery.vue')
    },
    {
      path: `/a/:album_id${ID}/edit`,
      component: () => import('../views/AlbumEdit.vue')
    },
    {
      path: '/s/:token',
      component: () => import('../views/ShareLink.vue')
    },

    /* The links from before folders: an organisation became a top-level folder with the same id. */
    {
      path: `/:organisation_id${ID}`,
      redirect: (to) => `/f/${to.params.organisation_id}`
    },
    {
      path: `/:organisation_id${ID}/create`,
      redirect: (to) => ({
        path: '/a/new',
        query: { folder: to.params.organisation_id }
      })
    },
    {
      path: `/:organisation_id${ID}/:album_id${ID}`,
      redirect: (to) => `/a/${to.params.album_id}`
    },
    {
      path: `/:organisation_id${ID}/:album_id${ID}/edit`,
      redirect: (to) => `/a/${to.params.album_id}/edit`
    },

    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFound.vue')
    }
  ],
  scrollBehavior(to, from, saved) {
    return saved || { top: 0 }
  }
})

export default router
