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
            <v-list-item v-for="module in modules" :key="module.name" :prepend-icon="module.icon" :title="module.title"
                :value="module.name" :to="module.route" color="primary" />
        </v-list>

        <template v-slot:append>
            <v-divider />

            <!-- Usuario y Logout -->
            <v-list density="compact" nav>
                <v-list-item prepend-icon="mdi-account" :title="rail ? '' : userEmail" />

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

// Email del usuario (puedes obtenerlo del token o del store)
const userEmail = computed(() => {
    // Por ahora mostramos un placeholder
    // Luego lo obtendremos del backend
    return 'admin@infodriver.com'
})

// Módulos del sistema
const modules = ref([
    {
        name: 'dashboard',
        title: 'Dashboard',
        icon: 'mdi-view-dashboard',
        route: '/dashboard'
    },
    {
        name: 'users',
        title: 'Usuarios',
        icon: 'mdi-account-multiple',
        route: '/users'
    },
    {
        name: 'roles',
        title: 'Roles',
        icon: 'mdi-shield-account',
        route: '/roles'
    },
    {
        name: 'permissions',
        title: 'Permisos',
        icon: 'mdi-lock',
        route: '/permissions'
    },
    {
        name: 'settings',
        title: 'Configuración',
        icon: 'mdi-cog',
        route: '/settings'
    }
])

const handleLogout = () => {
    authStore.logout()
}
</script>