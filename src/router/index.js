import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('../views/RequestsMap.vue'),
    meta: { public: true },
  },
  {
    path: '/login',
    component: () => import('../views/Login.vue'),
    meta: { public: true, guestOnly: true },
  },
  {
    path: '/register',
    component: () => import('../views/Register.vue'),
    meta: { public: true, guestOnly: true },
  },
  {
    path: '/create',
    component: () => import('../views/CreateRequest.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/messages',
    component: () => import('../views/Messages.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(to => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login?redirect=' + to.fullPath
  if (to.meta.guestOnly && auth.isLoggedIn) return '/'
})

export default router