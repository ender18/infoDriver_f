<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/administration')">
        Volver a Administración
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Roles</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Toolbar -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Buscar rol..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex align-center gap-3">
        <v-chip size="small" variant="tonal" color="primary">{{ filteredRoles.length }} roles</v-chip>
        <v-btn v-if="auth.hasPermission('roles:create')" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nuevo rol</v-btn>
      </v-col>
    </v-row>

    <!-- Tabla -->
    <v-card elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredRoles"
        :loading="loading"
        items-per-page="15"
        hover
      >
        <!-- Nombre con chip de color -->
        <template #item.name="{ item }">
          <v-chip :color="roleColor(item.name)" size="small" variant="tonal">
            {{ item.name }}
          </v-chip>
        </template>

        <!-- Descripción -->
        <template #item.description="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ item.description || '—' }}</span>
        </template>

        <!-- Permisos -->
        <template #item.permissions="{ item }">
          <v-chip size="x-small" variant="tonal" color="secondary">
            {{ item.permissions?.length ?? 0 }}
          </v-chip>
        </template>

        <!-- Estado -->
        <template #item.is_active="{ item }">
          <v-icon :color="item.is_active ? 'success' : 'error'" size="18">
            {{ item.is_active ? 'mdi-check-circle' : 'mdi-close-circle' }}
          </v-icon>
        </template>

        <!-- Fecha -->
        <template #item.created_at="{ item }">
          <span class="text-caption text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn icon="mdi-eye" size="small" variant="text" color="primary"
              @click="$router.push(`/roles/${item.id}`)" />
            <v-btn v-if="auth.hasPermission('roles:update')" icon="mdi-pencil" size="small" variant="text" color="secondary"
              @click="openEdit(item)" />
            <v-btn v-if="auth.hasPermission('roles:delete')" icon="mdi-delete" size="small" variant="text" color="error"
              @click="confirmDelete(item)" />
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@6" />
        </template>

        <template #no-data>
          <div class="text-center py-10 text-medium-emphasis">
            <v-icon size="40" class="mb-2">mdi-shield-off</v-icon>
            <div class="text-body-2">No hay roles</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog crear / editar -->
    <v-dialog v-model="formDialog" max-width="460" persistent>
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">
          {{ editTarget ? 'Editar rol' : 'Nuevo rol' }}
        </v-card-title>
        <v-card-text class="px-5">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="form.name"
                  label="Nombre *"
                  variant="outlined"
                  density="compact"
                  :error-messages="nameError"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 2 || 'Mínimo 2 caracteres', v => v.length <= 50 || 'Máximo 50 caracteres']"
                  @input="nameError = ''"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.description"
                  label="Descripción"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  auto-grow
                />
              </v-col>
              <v-col v-if="editTarget" cols="12">
                <v-switch
                  v-model="form.is_active"
                  label="Rol activo"
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
            {{ editTarget ? 'Guardar cambios' : 'Crear rol' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog confirmar eliminar -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Desactivar rol</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Desactivar el rol <strong>{{ deleteTarget?.name }}</strong>? Los usuarios con este rol perderán sus permisos asociados.
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

const roles = ref([])
const loading = ref(false)
const search = ref('')
const nameError = ref('')

const formDialog = ref(false)
const formRef = ref(null)
const editTarget = ref(null)
const saving = ref(false)
const emptyForm = () => ({ name: '', description: '', is_active: true })
const form = ref(emptyForm())

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const snack = ref({ show: false, text: '', color: 'success' })

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Descripción', key: 'description', sortable: false },
  { title: 'Permisos', key: 'permissions', align: 'center', sortable: false },
  { title: 'Activo', key: 'is_active', align: 'center' },
  { title: 'Creado', key: 'created_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const filteredRoles = computed(() => {
  if (!search.value) return roles.value
  const q = search.value.toLowerCase()
  return roles.value.filter(r =>
    r.name?.toLowerCase().includes(q) ||
    r.description?.toLowerCase().includes(q)
  )
})

const roleColorMap = { superadmin: 'error', admin: 'warning', moderator: 'info', user: 'success' }
const roleColor = (name) => roleColorMap[name?.toLowerCase()] ?? 'secondary'
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const loadRoles = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/roles/', { params: { skip: 0, limit: 100 } })
    roles.value = data
  } catch {
    showSnack('Error al cargar roles', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editTarget.value = null
  form.value = emptyForm()
  nameError.value = ''
  formDialog.value = true
}

const openEdit = (role) => {
  editTarget.value = role
  form.value = { name: role.name, description: role.description ?? '', is_active: role.is_active }
  nameError.value = ''
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
      const original = editTarget.value
      const payload = {}
      if (form.value.name !== original.name) payload.name = form.value.name
      if (form.value.description !== (original.description ?? '')) payload.description = form.value.description || null
      if (form.value.is_active !== original.is_active) payload.is_active = form.value.is_active

      const { data } = await apiClient.patch(`/roles/${original.id}`, payload)
      const idx = roles.value.findIndex(r => r.id === original.id)
      if (idx !== -1) roles.value[idx] = { ...roles.value[idx], ...data }
      showSnack('Rol actualizado')
    } else {
      const { data } = await apiClient.post('/roles/', {
        name: form.value.name,
        description: form.value.description || null,
      })
      roles.value.unshift(data)
      showSnack('Rol creado')
    }
    closeForm()
  } catch (err) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string' && detail.toLowerCase().includes('already exists')) {
      nameError.value = 'Este nombre ya existe'
    } else {
      showSnack(Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Error al guardar'), 'error')
    }
  } finally {
    saving.value = false
  }
}

const confirmDelete = (role) => {
  deleteTarget.value = role
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await apiClient.delete(`/roles/${deleteTarget.value.id}`)
    const idx = roles.value.findIndex(r => r.id === deleteTarget.value.id)
    if (idx !== -1) roles.value[idx] = { ...roles.value[idx], is_active: false }
    deleteDialog.value = false
    showSnack('Rol desactivado')
  } catch {
    showSnack('Error al desactivar rol', 'error')
  } finally {
    deleting.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadRoles)
</script>
