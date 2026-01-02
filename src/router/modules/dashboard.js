// src/router/modules/dashboard.js
export default [
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true,
      title: 'Dashboard',
      layout: 'main'
    }
  }
]