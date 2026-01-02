// src/router/modules/auth.js
export default [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false }
  }
]