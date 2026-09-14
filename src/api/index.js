import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'https://tutor-api-production-8f83.up.railway.app/api',
  timeout: 10000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('tutor_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || '网络错误，请稍后重试'
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('tutor_token')
      localStorage.removeItem('tutor_user')
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  }
)

export default api