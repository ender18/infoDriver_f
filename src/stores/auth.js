// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, logout as logoutApi, fetchUser as fetchUserApi } from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  // Estado
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const loading = ref(false)
  const error = ref(null)

  // Computed
  const isAuthenticated = computed(() => !!token.value)


  const fetchUser = async () => {
    if (!token.value) return

    try {
      const userData = await fetchUserApi()
      user.value = userData
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (err) {
      console.error('Error al obtener usuario:', err)
      logout()
    }
  }

  // Acciones
  const login = async (username, password) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await loginApi(username, password)
      
      // Guardar token
      token.value = response.access_token
      localStorage.setItem('token', response.access_token)
      
      // Aquí podrías guardar datos del usuario si tu backend los devuelve
      // user.value = response.user
      // localStorage.setItem('user', JSON.stringify(response.user))
      
      // Redirigir al dashboard
      router.push('/dashboard')
      
      return true
    } catch (err) {
      error.value = err.response?.data?.detail || 'Error al iniciar sesión'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    logoutApi()
    router.push('/login')
  }

  return {
    // Estado
    token,
    user,
    loading,
    error,
    // Computed
    isAuthenticated,
    // Acciones
    login,
    logout,
    fetchUser
  }
})