<!-- src/views/auth/Login.vue -->
<template>
  <v-app>
    <v-main class="bg-surface">
      <v-container fluid class="fill-height">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <LoginForm />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import LoginForm from '@/components/auth/LoginForm.vue'
</script>