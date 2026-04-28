<template>
  <v-app>
    <v-main>
      <v-container class="d-flex align-center justify-center" style="min-height: 100vh;">
        <div class="text-center">
          <v-icon size="64" color="error" class="mb-4">mdi-lock</v-icon>
          <div class="text-h5 font-weight-bold mb-2">Acceso denegado</div>
          <div class="text-body-2 text-medium-emphasis mb-6">
            No tienes permisos para acceder a esta sección.
          </div>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-home" @click="$router.push('/dashboard')">
            Volver al panel principal
          </v-btn>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>
