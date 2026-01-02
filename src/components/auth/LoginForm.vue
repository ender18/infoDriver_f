<!-- src/components/auth/LoginForm.vue -->
<template>
  <v-card flat class="mx-auto" max-width="420">
    <v-card-text class="pa-8">
      <div class="text-h4 font-weight-bold text-center mb-2">
        Bienvenido a <span class="text-primary">InfoDriver</span>
      </div>
      <div class="text-body-2 text-medium-emphasis text-center mb-10 mt-10">
        Ingresa tus credenciales para continuar
      </div>

      <v-form ref="formRef" @submit.prevent="handleLogin">
        <v-text-field v-model="credentials.username" label="Correo electrónico" type="email" variant="outlined"
          :rules="[rules.required, rules.email]" hide-details="auto" class="mb-4" />

        <v-text-field v-model="credentials.password" label="Contraseña" :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showPassword = !showPassword" variant="outlined" :rules="[rules.required]"
          hide-details="auto" class="mb-6" />

        <v-alert v-if="authStore.error" type="error" variant="tonal" density="compact" class="mb-6">
          {{ authStore.error }}
        </v-alert>

        <v-btn type="submit" color="primary" block size="x-large" :loading="authStore.loading" elevation="0">
          Iniciar Sesión
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const formRef = ref(null)

const credentials = ref({
  username: '',
  password: ''
})

const showPassword = ref(false)

const rules = {
  required: value => !!value || 'Este campo es requerido',
  email: value => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) || 'Ingresa un correo válido'
  }
}

const handleLogin = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  await authStore.login(credentials.value.username, credentials.value.password)
}
</script>