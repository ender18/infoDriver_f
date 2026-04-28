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
    
    // 403
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('@/views/Forbidden.vue')
    },

    // Ruta 404
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/dashboard'
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }
  if (to.path === '/login' && authStore.isAuthenticated) {
    return next('/dashboard')
  }
  if (to.meta.requiredPermission && !authStore.hasPermission(to.meta.requiredPermission)) {
    return next('/403')
  }
  next()
})

export default router