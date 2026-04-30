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
    meta: { requiresAuth: true, title: 'Usuarios', requiredPermission: 'users:read' }
  },
  {
    path: '/users/:id',
    name: 'user-detail',
    component: () => import('@/views/modules/UserDetail.vue'),
    meta: { requiresAuth: true, title: 'Detalle de Usuario', requiredPermission: 'users:read' }
  },
  {
    path: '/roles',
    name: 'roles',
    component: () => import('@/views/modules/Roles.vue'),
    meta: { requiresAuth: true, title: 'Roles', requiredPermission: 'roles:read' }
  },
  {
    path: '/roles/:id',
    name: 'role-detail',
    component: () => import('@/views/modules/RoleDetail.vue'),
    meta: { requiresAuth: true, title: 'Detalle de Rol', requiredPermission: 'roles:read' }
  },
  {
    path: '/permissions',
    name: 'permissions',
    component: () => import('@/views/modules/Permissions.vue'),
    meta: { requiresAuth: true, title: 'Permisos', requiredPermission: 'permissions:read' }
  },
  {
    path: '/tools',
    name: 'tools',
    component: () => import('@/views/modules/Tools.vue'),
    meta: { requiresAuth: true, title: 'Herramientas', requiredPermission: 'tools:run' }
  },
  {
    path: '/tools/drivers-validation',
    name: 'drivers-validation',
    component: () => import('@/views/modules/DriversValidation.vue'),
    meta: { requiresAuth: true, title: 'Validación de Conductores', requiredPermission: 'tools:run' }
  },
  {
    path: '/tools/drivers-accounts',
    name: 'drivers-accounts',
    component: () => import('@/views/modules/DriversAccounts.vue'),
    meta: { requiresAuth: true, title: 'Saldos de Conductores', requiredPermission: 'tools:run' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/modules/Settings.vue'),
    meta: { requiresAuth: true, title: 'Configuración' }
  },
  {
    path: '/companies',
    name: 'companies',
    component: () => import('@/views/modules/Companies.vue'),
    meta: { requiresAuth: true, title: 'Compañías', requiredPermission: 'companies:read' }
  }
]