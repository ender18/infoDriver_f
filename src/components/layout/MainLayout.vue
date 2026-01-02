<!-- src/components/layout/MainLayout.vue -->
<template>
    <v-app>
        <v-app-bar color="white" elevation="1">
            <!-- Contenedor centrado para el app-bar -->
            <div class="mx-auto" style="max-width: 1440px; width: 100%;">
                <div class="d-flex align-center">
                    <v-app-bar-title class="font-weight-bold">
                        <router-link to="/dashboard" class="text-decoration-none">
                            <span class="text-primary">InfoDriver</span>
                        </router-link>
                    </v-app-bar-title>
                    <v-spacer />
                    <!-- Menú de usuario -->
                    <v-menu>
                        <template v-slot:activator="{ props }">
                            <v-btn icon v-bind="props">
                                <v-icon>mdi-account-circle</v-icon>
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item>
                                <v-list-item-title>{{ userEmail }}</v-list-item-title>
                                <v-list-item-subtitle>{{ userRole }}</v-list-item-subtitle>
                            </v-list-item>
                            <v-divider />
                            <v-list-item prepend-icon="mdi-account" title="Mi Perfil" />
                            <v-list-item prepend-icon="mdi-cog" title="Configuración" />
                            <v-divider />
                            <v-list-item prepend-icon="mdi-logout" title="Cerrar Sesión" @click="handleLogout" />
                        </v-list>
                    </v-menu>
                </div>
            </div>
        </v-app-bar>
        <v-main class="bg-white">
            <!-- Contenedor centrado con ancho máximo -->
            <v-container fluid class="pa-6 mx-auto" style="max-width: 1440px;">
                <slot />
            </v-container>
        </v-main>
    </v-app>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Obtener información del usuario al montar el componente si no existe
onMounted(() => {
    if (authStore.isAuthenticated && !authStore.user) {
        authStore.fetchUser()
    }
})

const userEmail = computed(() => {
    return authStore.user?.email || 'Cargando...'
})

const userRole = computed(() => {
    if (!authStore.user?.roles || authStore.user.roles.length === 0) {
        return 'Usuario'
    }
    return authStore.user.roles[0].description || authStore.user.roles[0].name
})

const handleLogout = () => {
    authStore.logout()
}
</script>