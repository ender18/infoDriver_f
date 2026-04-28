<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/administration')">
        Volver a Administración
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Permisos</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Toolbar -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Buscar permiso..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" sm="3" md="2">
        <v-select
          v-model="activeResource"
          :items="[{ title: 'Todos los recursos', value: null }, ...resources.map(r => ({ title: r, value: r }))]"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex align-center gap-3">
        <v-chip size="small" variant="tonal" color="primary">{{ filteredPerms.length }} permisos</v-chip>
        <v-btn v-if="auth.hasPermission('permissions:create')" color="primary" prepend-icon="mdi-plus" @click="openCreate">Nuevo permiso</v-btn>
      </v-col>
    </v-row>

    <!-- Tabla -->
    <v-card elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredPerms"
        :loading="loading"
        items-per-page="20"
        hover
      >
        <!-- Nombre -->
        <template #item.name="{ item }">
          <code class="text-body-2">{{ item.name }}</code>
        </template>

        <!-- Recurso -->
        <template #item.resource="{ item }">
          <v-chip :color="resourceColor(item.resource)" size="x-small" variant="tonal">
            {{ item.resource }}
          </v-chip>
        </template>

        <!-- Acción -->
        <template #item.action="{ item }">
          <v-chip :color="actionColor(item.action)" size="x-small" variant="outlined">
            {{ item.action }}
          </v-chip>
        </template>

        <!-- Descripción -->
        <template #item.description="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ item.description || '—' }}</span>
        </template>

        <!-- Fecha -->
        <template #item.created_at="{ item }">
          <span class="text-caption text-medium-emphasis">{{ formatDate(item.created_at) }}</span>
        </template>

        <!-- Acciones -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn v-if="auth.hasPermission('permissions:update')" icon="mdi-pencil" size="small" variant="text" color="secondary" @click="openEdit(item)" />
            <v-btn v-if="auth.hasPermission('permissions:delete')" icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(item)" />
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@8" />
        </template>

        <template #no-data>
          <div class="text-center py-10 text-medium-emphasis">
            <v-icon size="40" class="mb-2">mdi-lock-off</v-icon>
            <div class="text-body-2">No hay permisos{{ activeResource ? ` para "${activeResource}"` : '' }}</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog crear / editar -->
    <v-dialog v-model="formDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">
          {{ editTarget ? 'Editar permiso' : 'Nuevo permiso' }}
        </v-card-title>
        <v-card-text class="px-5">
          <v-form ref="formRef" @submit.prevent="submitForm">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.resource"
                  label="Recurso *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 2 || 'Mínimo 2 caracteres']"
                  @input="autoFillName"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.action"
                  label="Acción *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 2 || 'Mínimo 2 caracteres']"
                  @input="autoFillName"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.name"
                  label="Nombre *"
                  variant="outlined"
                  density="compact"
                  :error-messages="nameError"
                  :rules="[v => !!v || 'Requerido', v => v.length >= 3 || 'Mínimo 3 caracteres']"
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
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="closeForm">Cancelar</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" @click="submitForm">
            {{ editTarget ? 'Guardar cambios' : 'Crear permiso' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog confirmar eliminar -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Eliminar permiso</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Eliminar <strong>{{ deleteTarget?.name }}</strong> permanentemente? Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" :loading="deleting" @click="doDelete">Eliminar</v-btn>
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

const permissions = ref([])
const loading = ref(false)
const search = ref('')
const activeResource = ref(null)
const nameError = ref('')

const formDialog = ref(false)
const formRef = ref(null)
const editTarget = ref(null)
const saving = ref(false)
const emptyForm = () => ({ name: '', resource: '', action: '', description: '' })
const form = ref(emptyForm())

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const snack = ref({ show: false, text: '', color: 'success' })

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Recurso', key: 'resource' },
  { title: 'Acción', key: 'action' },
  { title: 'Descripción', key: 'description', sortable: false },
  { title: 'Creado', key: 'created_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const resources = computed(() => [...new Set(permissions.value.map(p => p.resource))].sort())

const filteredPerms = computed(() => {
  let list = activeResource.value
    ? permissions.value.filter(p => p.resource === activeResource.value)
    : permissions.value

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.resource?.toLowerCase().includes(q) ||
      p.action?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }
  return list
})

const resColors = ['primary', 'indigo', 'teal', 'deep-purple', 'blue-grey', 'cyan', 'brown', 'secondary']
const resColorCache = {}
const resourceColor = (res) => {
  if (!resColorCache[res]) {
    resColorCache[res] = resColors[Object.keys(resColorCache).length % resColors.length]
  }
  return resColorCache[res]
}

const actionColorMap = { read: 'info', create: 'success', update: 'warning', delete: 'error', manage: 'deep-purple' }
const actionColor = (action) => actionColorMap[action?.toLowerCase()] ?? 'secondary'

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const loadPermissions = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/permissions/', { params: { skip: 0, limit: 500 } })
    permissions.value = data
  } catch {
    showSnack('Error al cargar permisos', 'error')
  } finally {
    loading.value = false
  }
}


const autoFillName = () => {
  if (form.value.resource && form.value.action) {
    form.value.name = `${form.value.resource}:${form.value.action}`
  }
}

const openCreate = () => {
  editTarget.value = null
  form.value = emptyForm()
  nameError.value = ''
  formDialog.value = true
}

const openEdit = (perm) => {
  editTarget.value = perm
  form.value = { name: perm.name, resource: perm.resource, action: perm.action, description: perm.description ?? '' }
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
      if (form.value.resource !== original.resource) payload.resource = form.value.resource
      if (form.value.action !== original.action) payload.action = form.value.action
      if (form.value.description !== (original.description ?? '')) payload.description = form.value.description || null

      const { data } = await apiClient.patch(`/permissions/${original.id}`, payload)
      const idx = permissions.value.findIndex(p => p.id === original.id)
      if (idx !== -1) permissions.value[idx] = { ...permissions.value[idx], ...data }
      showSnack('Permiso actualizado')
    } else {
      const { data } = await apiClient.post('/permissions/', {
        name: form.value.name,
        resource: form.value.resource,
        action: form.value.action,
        description: form.value.description || null,
      })
      permissions.value.unshift(data)
      showSnack('Permiso creado')
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

const confirmDelete = (perm) => {
  deleteTarget.value = perm
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await apiClient.delete(`/permissions/${deleteTarget.value.id}`)
    permissions.value = permissions.value.filter(p => p.id !== deleteTarget.value.id)
    deleteDialog.value = false
    showSnack('Permiso eliminado')
  } catch {
    showSnack('Error al eliminar permiso', 'error')
  } finally {
    deleting.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadPermissions)
</script>
