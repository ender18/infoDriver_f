<!-- src/components/layout/Sidebar.vue -->
<template>
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent @click="rail = false">
        <!-- Header del Sidebar -->
        <v-list-item :prepend-icon="rail ? 'mdi-view-grid' : 'mdi-view-grid-outline'" :title="rail ? '' : 'InfoDriver'"
            nav>
            <template v-slot:append>
                <v-btn v-if="!rail" icon="mdi-chevron-left" variant="text" @click.stop="rail = !rail" />
            </template>
        </v-list-item>

        <v-divider />

        <!-- Lista de módulos -->
        <v-list density="compact" nav>
            <v-list-item v-for="module in visibleModules" :key="module.name" :prepend-icon="module.icon" :title="module.title"
                :value="module.name" :to="module.route" color="primary" />
        </v-list>

        <template v-slot:append>
            <v-divider />

            <!-- Usuario y Logout -->
            <v-list density="compact" nav>
                <v-list-item prepend-icon="mdi-account" :title="rail ? '' : authStore.user?.email || ''" />

                <v-list-item prepend-icon="mdi-logout" :title="rail ? '' : 'Cerrar Sesión'" @click="handleLogout"
                    color="error" />
            </v-list>
        </template>
    </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const drawer = ref(true)
const rail = ref(false)

const allModules = [
    { name: 'dashboard',   title: 'Dashboard',      icon: 'mdi-view-dashboard',   route: '/dashboard',        permission: null },
    { name: 'users',       title: 'Usuarios',        icon: 'mdi-account-multiple', route: '/users',            permission: 'users:read' },
    { name: 'roles',       title: 'Roles',           icon: 'mdi-shield-account',   route: '/roles',            permission: 'roles:read' },
    { name: 'permissions', title: 'Permisos',        icon: 'mdi-lock',             route: '/permissions',      permission: 'permissions:read' },
    { name: 'tools',       title: 'Herramientas',    icon: 'mdi-wrench',           route: '/tools',            permission: 'tools:run' },
    { name: 'settings',    title: 'Configuración',   icon: 'mdi-cog',              route: '/settings',         permission: null },
]

const visibleModules = computed(() =>
    allModules.filter(m => !m.permission || authStore.hasPermission(m.permission))
)

const handleLogout = () => {
    authStore.logout()
}
</script>