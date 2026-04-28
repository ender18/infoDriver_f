<!-- src/views/Dashboard.vue -->
<template>
    <MainLayout>
        <div class="text-h5 font-weight-bold mb-2">
            Panel principal
        </div>
        <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 80px;" />

        <v-row>
            <v-col v-for="module in filteredModules" :key="module.id" cols="12" md="6" lg="2" class="d-flex">
                <v-card elevation="1" height="100%" @click="$router.push(module.route)" style="cursor: pointer; width: 100%;">
                    <v-card-text class="text-center pa-6">
                        <v-icon :icon="module.icon" size="60" color="primary" class="mb-3" />
                        <div class="text-subtitle-1 font-weight-bold mb-1">
                            {{ module.title }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ module.description }}
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </MainLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const modules = ref([
    {
        id: 1,
        title: 'Administración de Roles y Permisos',
        description: 'Gestiona usuarios, roles y permisos del sistema',
        icon: 'mdi-shield-account',
        route: '/administration',
        submodulePermissions: ['users:read', 'users:create', 'users:update', 'users:delete', 'roles:read', 'roles:create', 'roles:update', 'roles:delete']
    },
    {
        id: 2,
        title: 'Herramientas',
        description: 'Validación y análisis de datos de conductores',
        icon: 'mdi-wrench',
        route: '/tools',
        submodulePermissions: ['tools:run']
    },
    {
        id: 3,
        title: 'Configuración',
        description: 'Gestiona compañías y parámetros del sistema',
        icon: 'mdi-cog',
        route: '/settings',
        submodulePermissions: ['companies:read', 'companies:create', 'companies:update', 'companies:delete']
    }
])

const filteredModules = computed(() => {
    return modules.value.filter(module => {
        if (!module.submodulePermissions || module.submodulePermissions.length === 0) return true

        // Verificar si el usuario tiene al menos 1 permiso de los submodulos
        return module.submodulePermissions.some(permission =>
            authStore.user?.permissions?.includes(permission)
        )
    })
})
</script>