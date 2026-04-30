<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/dashboard')">
        Volver al panel principal
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Herramientas</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <v-row>
      <v-col v-for="sub in submodules" :key="sub.name" cols="12" md="4" lg="3" class="d-flex">
        <v-card elevation="1" height="100%" @click="$router.push(sub.route)" style="cursor: pointer; width: 100%;">
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
import MainLayout from '@/components/layout/MainLayout.vue'

const submodules = [
  {
    name: 'drivers-validation',
    title: 'Validación de Conductores',
    description: 'Detecta errores en los datos de conductores por compañía',
    icon: 'mdi-account-check',
    color: 'primary',
    route: '/tools/drivers-validation',
  },
  {
    name: 'drivers-accounts',
    title: 'Saldos de Conductores',
    description: 'Consulta conductores con saldo positivo pendiente por compañía',
    icon: 'mdi-currency-usd',
    color: 'error',
    route: '/tools/drivers-accounts',
  },
]
</script>
