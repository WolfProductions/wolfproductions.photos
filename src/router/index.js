import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // { path: '/', component: () => import('../views/Home.vue') },
    {
      path: '/home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/',
      component: () => import('../views/Organisations.vue')
    },
    {
      path: '/:organisation_id',
      component: () => import('../views/Albums.vue')
    },
    {
      path: '/:organisation_id/create',
      component: () => import('../views/CreateAlbum.vue')
    },
    {
      path: '/:organisation_id/:album_id',
      component: () => import('../views/Gallery.vue')
    },
    {
      path: '/:organisation_id/:album_id/edit',
      component: () => import('../views/EditAlbum.vue')
    }
  ]
})

export default router
