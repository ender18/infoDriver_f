<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/administration')">
        Volver a Administración
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Usuarios</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Barra de búsqueda + nuevo -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Buscar usuario..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex align-center gap-3">
        <v-chip size="small" variant="tonal" color="primary">
          {{ filteredUsers.length }} usuarios
        </v-chip>
        <v-btn v-if="auth.hasPermission('users:create')" color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Nuevo usuario
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tabla -->
    <v-card elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredUsers"
        :loading="loading"
        items-per-page="15"
        hover
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <v-avatar size="34" :color="avatarColor(item.email)" class="text-white text-caption font-weight-bold">
              {{ initials(item.first_name, item.last_name, item.email) }}
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-medium">{{ fullName(item) }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.username }}</div>
            </div>
          </div>
        </template>

        <template #item.email="{ item }">
          <span class="text-body-2">{{ item.email }}</span>
        </template>

        <template #item.roles="{ item }">
          <div class="d-flex flex-wrap gap-1">
            <v-chip
              v-for="role in item.roles"
              :key="role.id"
              :color="roleColor(role.name)"
              size="x-small"
              variant="tonal"
            >
              {{ role.name }}
            </v-chip>
            <span v-if="!item.roles?.length" class="text-caption text-disabled">—</span>
          </div>
        </template>

        <template #item.is_active="{ item }">
          <v-icon :color="item.is_active ? 'success' : 'error'" size="18">
            {{ item.is_active ? 'mdi-check-circle' : 'mdi-close-circle' }}
          </v-icon>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-caption text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn icon="mdi-eye" size="small" variant="text" color="primary"
              @click="$router.push(`/users/${item.id}`)" />
            <v-btn v-if="auth.hasPermission('users:update')" icon="mdi-pencil" size="small" variant="text" color="secondary"
              @click="openEdit(item)" />
            <v-btn v-if="auth.hasPermission('users:delete')" icon="mdi-delete" size="small" variant="text" color="error"
              @click="confirmDelete(item)" />
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@8" />
        </template>

        <template #no-data>
          <div class="text-center py-10 text-medium-emphasis">
            <v-icon size="40" class="mb-2">mdi-account-off</v-icon>
            <div class="text-body-2">No hay usuarios</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog crear / editar -->
    <v-dialog v-model="formDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">
          {{ editTarget ? 'Editar usuario' : 'Nuevo usuario' }}
        </v-card-title>

        <v-card-text class="px-5">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.first_name"
                  label="Nombre"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.last_name"
                  label="Apellido"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <!-- Solo en creación -->
              <v-col v-if="!editTarget" cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  label="Email *"
                  type="email"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Requerido', v => /.+@.+\..+/.test(v) || 'Email inválido']"
                />
              </v-col>
              <v-col v-if="!editTarget" cols="12" sm="6">
                <v-text-field
                  v-model="form.username"
                  label="Username *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 3 || 'Mínimo 3 caracteres']"
                />
              </v-col>
              <v-col v-if="!editTarget" cols="12">
                <v-text-field
                  v-model="form.password"
                  label="Contraseña *"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                  density="compact"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showPassword = !showPassword"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 8 || 'Mínimo 8 caracteres']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.telephone"
                  label="Teléfono"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.profile_picture"
                  label="Foto de perfil (URL)"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <!-- Solo en edición -->
              <v-col v-if="editTarget" cols="12">
                <v-switch
                  v-model="form.is_active"
                  label="Cuenta activa"
                  color="success"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" @click="submitForm">
            {{ editTarget ? 'Guardar cambios' : 'Crear usuario' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog confirmar desactivar -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Desactivar usuario</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Desactivar a <strong>{{ deleteTarget?.email }}</strong>? El usuario perderá acceso al sistema.
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="doDelete">Desactivar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="3000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const users = ref([])
const loading = ref(false)
const search = ref('')

// Form dialog
const formDialog = ref(false)
const formRef = ref(null)
const editTarget = ref(null)
const saving = ref(false)
const showPassword = ref(false)
const emptyForm = () => ({ email: '', username: '', password: '', first_name: '', last_name: '', telephone: '', profile_picture: '', is_active: true })
const form = ref(emptyForm())

// Delete dialog
const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const snack = ref({ show: false, text: '', color: 'success' })

const headers = [
  { title: 'Usuario', key: 'name', sortable: false },
  { title: 'Email', key: 'email' },
  { title: 'Roles', key: 'roles', sortable: false },
  { title: 'Activo', key: 'is_active', align: 'center' },
  { title: 'Creado', key: 'created_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  const q = search.value.toLowerCase()
  return users.value.filter(u =>
    u.email?.toLowerCase().includes(q) ||
    u.username?.toLowerCase().includes(q) ||
    u.first_name?.toLowerCase().includes(q) ||
    u.last_name?.toLowerCase().includes(q)
  )
})

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

const loadUsers = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/users/', { params: { skip: 0, limit: 200 } })
    users.value = data
  } catch {
    showSnack('Error al cargar usuarios', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editTarget.value = null
  form.value = emptyForm()
  showPassword.value = false
  formDialog.value = true
}

const openEdit = (user) => {
  editTarget.value = user
  form.value = {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    telephone: user.telephone ?? '',
    profile_picture: user.profile_picture ?? '',
    is_active: user.is_active,
  }
  formDialog.value = true
}

const closeForm = () => {
  formDialog.value = false
  formRef.value?.reset()
}

const submitForm = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    if (editTarget.value) {
      // Solo enviar campos que cambiaron
      const original = editTarget.value
      const payload = {}
      if (form.value.first_name !== (original.first_name ?? '')) payload.first_name = form.value.first_name || null
      if (form.value.last_name !== (original.last_name ?? '')) payload.last_name = form.value.last_name || null
      if (form.value.telephone !== (original.telephone ?? '')) payload.telephone = form.value.telephone || null
      if (form.value.profile_picture !== (original.profile_picture ?? '')) payload.profile_picture = form.value.profile_picture || null
      if (form.value.is_active !== original.is_active) payload.is_active = form.value.is_active

      const { data } = await apiClient.patch(`/users/${original.id}`, payload)
      const idx = users.value.findIndex(u => u.id === original.id)
      if (idx !== -1) users.value[idx] = { ...users.value[idx], ...data }
      showSnack('Usuario actualizado')
    } else {
      const { data } = await apiClient.post('/auth/register', form.value)
      users.value.unshift(data)
      showSnack('Usuario creado')
    }
    closeForm()
  } catch (err) {
    const msg = err.response?.data?.detail
    showSnack(Array.isArray(msg) ? msg[0]?.msg : (msg ?? 'Error al guardar'), 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (user) => {
  deleteTarget.value = user
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await apiClient.delete(`/users/${deleteTarget.value.id}`)
    users.value = users.value.filter(u => u.id !== deleteTarget.value.id)
    deleteDialog.value = false
    showSnack('Usuario desactivado')
  } catch {
    showSnack('Error al desactivar usuario', 'error')
  } finally {
    deleting.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadUsers)
</script>
