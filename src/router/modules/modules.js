// src/router/modules/modules.js
export default [
  {
    path: '/administration',
    name: 'administration',
    component: () => import('@/views/modules/Administration.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Administración'
    }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/modules/Users.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Usuarios'
    }
  },
  {
    path: '/roles',
    name: 'roles',
    component: () => import('@/views/modules/Roles.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Roles'
    }
  },
  {
    path: '/permissions',
    name: 'permissions',
    component: () => import('@/views/modules/Permissions.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Permisos'
    }
  }
]