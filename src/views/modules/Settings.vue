<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/dashboard')">
        Volver al panel principal
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Configuración</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <v-row>
      <v-col v-for="sub in visibleSubmodules" :key="sub.name" cols="12" md="4" lg="3">
        <v-card elevation="1" @click="$router.push(sub.route)" style="cursor: pointer;" height="100%">
          <v-card-text class="text-center pa-6">
            <v-icon :icon="sub.icon" size="56" :color="sub.color" class="mb-3" />
            <div class="text-subtitle-1 font-weight-bold mb-1">{{ sub.title }}</div>
            <div class="text-caption text-medium-emphasis">{{ sub.description }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </MainLayout>
</template>

<script setup>
import { computed } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const submodules = [
  {
    name: 'companies',
    title: 'Compañías',
    description: 'Gestiona las compañías y sus credenciales de API',
    icon: 'mdi-office-building',
    color: 'primary',
    route: '/companies',
    permission: 'companies:read',
  },
  {
    name: 'banks',
    title: 'Bancos',
    description: 'Catálogo de bancos SPEI de México',
    icon: 'mdi-bank',
    color: 'success',
    route: '/banks',
    permission: null,
  },
]

const visibleSubmodules = computed(() =>
  submodules.filter(s => !s.permission || auth.hasPermission(s.permission))
)
</script>
