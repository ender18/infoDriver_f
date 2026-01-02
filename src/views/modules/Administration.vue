<!-- src/views/modules/Administration.vue -->
<template>
    <MainLayout>
        <div class="mb-4">
            <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/dashboard')">
                Volver al panel principal
            </v-btn>
        </div>

        <div class="text-h5 font-weight-bold mb-2">
            Administración de Roles y Permisos
        </div>
        <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 80px;" />

        <v-row>
            <v-col v-for="submodule in submodules" :key="submodule.name" cols="12" md="4">
                <v-card elevation="1" @click="navigateTo(submodule.route)" style="cursor: pointer;">
                    <v-card-text class="text-center pa-6">
                        <v-icon :icon="submodule.icon" size="60" :color="submodule.color" class="mb-3" />

                        <div class="text-subtitle-1 font-weight-bold mb-1">
                            {{ submodule.title }}
                        </div>

                        <div class="text-caption text-medium-emphasis">
                            {{ submodule.description }}
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </MainLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'

const router = useRouter()

const submodules = ref([
    {
        name: 'users',
        title: 'Usuarios',
        description: 'Administra los usuarios del sistema',
        icon: 'mdi-account-multiple',
        color: 'primary',
        route: '/users'
    },
    {
        name: 'roles',
        title: 'Roles',
        description: 'Gestiona los roles y sus permisos',
        icon: 'mdi-shield-account',
        color: 'success',
        route: '/roles'
    },
    {
        name: 'permissions',
        title: 'Permisos',
        description: 'Configura los permisos del sistema',
        icon: 'mdi-lock',
        color: 'warning',
        route: '/permissions'
    }
])

const navigateTo = (route) => {
    router.push(route)
}
</script>