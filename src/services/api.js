// src/services/api.js
import axios from 'axios'
import { useNotificationStore } from '@/stores/notification'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// URL base de tu backend FastAPI
const API_URL = 'http://127.0.0.1:8000/api'

// Crear instancia de axios (por defecto JSON)
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para añadir el token a todas las peticiones (lee del store, siempre fresco)
apiClient.interceptors.request.use(
  (config) => {
    const auth = useAuthStore()
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de respuesta — 401 expulsión, 403 notificación
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      const auth = useAuthStore()
      auth.logout()
      router.push('/login')
    } else if (status === 403) {
      const notify = useNotificationStore()
      notify.notify('No tienes permiso para realizar esta acción')
    }
    return Promise.reject(error)
  }
)

// Función de login (usa form-urlencoded porque tu backend lo requiere)
export const login = async (username, password) => {
  const params = new URLSearchParams()
  params.append('username', username)
  params.append('password', password)
  
  const response = await apiClient.post('/auth/login', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  return response.data
}

export const fetchUser = async () => {
  const response = await apiClient.get('/users/me')
  return response.data
}

// Función de logout
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export default apiClient