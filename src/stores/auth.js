import { defineStore } from 'pinia'
import api from '../api'

const TOKEN_KEY = 'tutor_token'
const USER_KEY = 'tutor_user'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  }),
  getters: {
    isLoggedIn: s => !!s.token,
    isParent: s => s.user?.role === 'parent',
    isTutor: s => s.user?.role === 'tutor',
  },
  actions: {
    setAuth({ token, user }) {
      this.token = token
      this.user = user
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    },
    async login(username, password) {
      const data = await api.post('/auth/login', { username, password })
      this.setAuth(data)
      return data.user
    },
    async register(payload) {
      const data = await api.post('/auth/register', payload)
      this.setAuth(data)
      return data.user
    },
    async fetchMe() {
      const user = await api.get('/auth/me')
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    },
    async updateProfile(payload) {
      const user = await api.put('/auth/profile', payload)
      this.user = user
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return user
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})