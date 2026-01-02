// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Importar módulos de rutas
import authRoutes from './modules/auth'
import dashboardRoutes from './modules/dashboard'
import moduleRoutes from './modules/modules'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Rutas importadas
    ...authRoutes,
    ...dashboardRoutes,
    ...moduleRoutes,
    
    // Ruta raíz
    {
      path: '/',
      redirect: '/dashboard'
    },
    
    // Ruta 404 (opcional pero recomendada)
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/dashboard'
    }
  ]
})

// Guard de navegación - protege las rutas
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !authStore.isAuthenticated) {
    // Si la ruta requiere auth y no está autenticado, va al login
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    // Si está autenticado y quiere ir al login, lo manda al dashboard
    next('/dashboard')
  } else {
    next()
  }
})

export default router