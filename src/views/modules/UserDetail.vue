<template>
  <MainLayout>
    <!-- Header -->
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/users')">
        Volver a Usuarios
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Detalle de Usuario</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-row v-if="user" gap="4">
      <!-- Info del usuario -->
      <v-col cols="12" md="4">
        <v-card elevation="0" border>
          <v-card-text class="text-center pa-6">
            <v-avatar size="72" :color="avatarColor(user.email)" class="text-white text-h6 font-weight-bold mb-3">
              {{ initials(user.first_name, user.last_name, user.email) }}
            </v-avatar>
            <div class="text-subtitle-1 font-weight-bold">{{ fullName(user) }}</div>
            <div class="text-caption text-medium-emphasis mb-3">@{{ user.username }}</div>
            <v-chip :color="user.is_active ? 'success' : 'error'" size="small" variant="tonal">
              {{ user.is_active ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </v-card-text>
          <v-divider />
          <v-list density="compact" lines="two">
            <v-list-item prepend-icon="mdi-email" title="Email" :subtitle="user.email" />
            <v-list-item prepend-icon="mdi-phone" title="Teléfono" :subtitle="user.telephone || '—'" />
            <v-list-item prepend-icon="mdi-calendar" title="Creado" :subtitle="formatDate(user.created_at)" />
            <v-list-item prepend-icon="mdi-clock" title="Último acceso" :subtitle="formatDate(user.last_login)" />
          </v-list>
        </v-card>
      </v-col>

      <!-- Roles -->
      <v-col cols="12" md="8">
        <v-card elevation="0" border>
          <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">Roles asignados</v-card-title>
          <v-card-text>
            <!-- Assign role -->
            <div v-if="auth.hasPermission('users:update')" class="d-flex gap-2 mb-4">
              <v-select
                v-model="selectedRole"
                :items="availableRoles"
                item-title="name"
                item-value="id"
                placeholder="Asignar rol..."
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 260px;"
              />
              <v-btn
                :disabled="!selectedRole"
                :loading="assigning"
                color="primary"
                variant="tonal"
                @click="assignRole"
              >
                Asignar
              </v-btn>
            </div>

            <!-- Lista de roles -->
            <div v-if="user.roles?.length">
              <v-chip
                v-for="role in user.roles"
                :key="role.id"
                :color="roleColor(role.name)"
                variant="tonal"
                class="mr-2 mb-2"
                :closable="auth.hasPermission('users:update')"
                @click:close="confirmRemoveRole(role)"
              >
                {{ role.name }}
              </v-chip>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis py-2">
              Sin roles asignados
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirm remove role -->
    <v-dialog v-model="removeRoleDialog" max-width="360">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Quitar rol</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Quitar el rol <strong>{{ removeRoleTarget?.name }}</strong> de este usuario?
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="removeRoleDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" :loading="removing" @click="doRemoveRole">Quitar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="3000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const route = useRoute()
const user = ref(null)
const allRoles = ref([])
const loading = ref(false)
const selectedRole = ref(null)
const assigning = ref(false)
const removeRoleDialog = ref(false)
const removeRoleTarget = ref(null)
const removing = ref(false)
const snack = ref({ show: false, text: '', color: 'success' })

const availableRoles = computed(() =>
  allRoles.value.filter(r => !user.value?.roles?.some(ur => ur.id === r.id))
)

const fullName = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email
const initials = (first, last, email) => {
  if (first || last) return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return email?.[0]?.toUpperCase() ?? '?'
}
const avatarColors = ['primary', 'secondary', 'indigo', 'teal', 'deep-purple', 'blue-grey']
const avatarColor = (email) => avatarColors[email?.charCodeAt(0) % avatarColors.length] ?? 'primary'
const roleColorMap = { superadmin: 'error', admin: 'warning', moderator: 'info', user: 'success' }
const roleColor = (name) => roleColorMap[name?.toLowerCase()] ?? 'secondary'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const loadUser = async () => {
  loading.value = true
  try {
    const [userRes, rolesRes] = await Promise.all([
      apiClient.get(`/users/${route.params.id}`),
      apiClient.get('/roles/', { params: { skip: 0, limit: 100 } }),
    ])
    user.value = userRes.data
    allRoles.value = rolesRes.data

    // Cargar roles del usuario
    const rolesData = await apiClient.get(`/users/${route.params.id}/roles`)
    user.value.roles = rolesData.data
  } catch {
    showSnack('Error al cargar usuario', 'error')
  } finally {
    loading.value = false
  }
}

const assignRole = async () => {
  assigning.value = true
  try {
    await apiClient.post(`/users/${user.value.id}/roles/${selectedRole.value}`)
    const role = allRoles.value.find(r => r.id === selectedRole.value)
    user.value.roles.push(role)
    selectedRole.value = null
    showSnack('Rol asignado')
  } catch {
    showSnack('Error al asignar rol', 'error')
  } finally {
    assigning.value = false
  }
}

const confirmRemoveRole = (role) => {
  removeRoleTarget.value = role
  removeRoleDialog.value = true
}

const doRemoveRole = async () => {
  removing.value = true
  try {
    await apiClient.delete(`/users/${user.value.id}/roles/${removeRoleTarget.value.id}`)
    user.value.roles = user.value.roles.filter(r => r.id !== removeRoleTarget.value.id)
    removeRoleDialog.value = false
    showSnack('Rol removido')
  } catch {
    showSnack('Error al remover rol', 'error')
  } finally {
    removing.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadUser)
</script>
