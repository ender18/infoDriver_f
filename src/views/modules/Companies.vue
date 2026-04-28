<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/settings')">
        Volver a Configuración
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Compañías</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Toolbar -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" sm="5" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Buscar compañía..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-spacer />
      <v-col cols="auto" class="d-flex align-center gap-3">
        <v-chip size="small" variant="tonal" color="primary">{{ filteredCompanies.length }} compañías</v-chip>
        <v-btn v-if="auth.hasPermission('companies:create')" color="primary" prepend-icon="mdi-plus" @click="openCreate">
          Nueva compañía
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tabla -->
    <v-card elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredCompanies"
        :loading="loading"
        items-per-page="15"
        hover
      >
        <!-- Nombre -->
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <v-avatar size="34" color="primary" class="text-white text-caption font-weight-bold">
              {{ item.name?.[0]?.toUpperCase() ?? '?' }}
            </v-avatar>
            <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
          </div>
        </template>

        <!-- País -->
        <template #item.country="{ item }">
          <span class="text-body-2">{{ item.country || '—' }}</span>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <span class="text-body-2">{{ item.email || '—' }}</span>
        </template>

        <!-- Teléfono -->
        <template #item.phone="{ item }">
          <span class="text-body-2">{{ item.phone || '—' }}</span>
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
            <v-btn v-if="auth.hasPermission('companies:update')" icon="mdi-pencil" size="small" variant="text" color="secondary"
              @click="openEdit(item)" />
            <v-btn v-if="auth.hasPermission('companies:delete')" icon="mdi-delete" size="small" variant="text" color="error"
              @click="confirmDelete(item)" />
          </div>
        </template>

        <template #loading>
          <v-skeleton-loader type="table-row@6" />
        </template>

        <template #no-data>
          <div class="text-center py-10 text-medium-emphasis">
            <v-icon size="40" class="mb-2">mdi-office-building-off</v-icon>
            <div class="text-body-2">No hay compañías</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog crear / editar -->
    <v-dialog v-model="formDialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">
          {{ editTarget ? 'Editar compañía' : 'Nueva compañía' }}
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
                  :rules="[v => !!v || 'Requerido', v => v.length >= 2 || 'Mínimo 2 caracteres', v => v.length <= 150 || 'Máximo 150 caracteres']"
                  @input="nameError = ''"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.country"
                  label="País"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.phone"
                  label="Teléfono"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !v || /.+@.+\..+/.test(v) || 'Email inválido']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.address"
                  label="Dirección"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.api_base_url"
                  label="API Base URL *"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Requerido']"
                  hint="Ej: https://api.servidor.com/v1/"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.api_subscription_key"
                  label="Subscription Key *"
                  :type="showKey ? 'text' : 'password'"
                  variant="outlined"
                  density="compact"
                  :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showKey = !showKey"
                  :rules="editTarget ? [] : [v => !!v || 'Requerido']"
                  :hint="editTarget ? 'Dejar vacío para no modificar' : ''"
                  persistent-hint
                />
              </v-col>
              <v-col v-if="editTarget" cols="12">
                <v-switch
                  v-model="form.is_active"
                  label="Compañía activa"
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
            {{ editTarget ? 'Guardar cambios' : 'Crear compañía' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog confirmar desactivar -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Desactivar compañía</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Desactivar <strong>{{ deleteTarget?.name }}</strong>? La compañía quedará inactiva en el sistema.
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

const companies = ref([])
const loading = ref(false)
const search = ref('')
const nameError = ref('')
const showKey = ref(false)

const formDialog = ref(false)
const formRef = ref(null)
const editTarget = ref(null)
const saving = ref(false)
const emptyForm = () => ({
  name: '', address: '', country: '', email: '', phone: '',
  api_base_url: '', api_subscription_key: '', is_active: true,
})
const form = ref(emptyForm())

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const snack = ref({ show: false, text: '', color: 'success' })

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'País', key: 'country' },
  { title: 'Email', key: 'email' },
  { title: 'Teléfono', key: 'phone' },
  { title: 'Activo', key: 'is_active', align: 'center' },
  { title: 'Creado', key: 'created_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const filteredCompanies = computed(() => {
  if (!search.value) return companies.value
  const q = search.value.toLowerCase()
  return companies.value.filter(c =>
    c.name?.toLowerCase().includes(q) ||
    c.country?.toLowerCase().includes(q) ||
    c.email?.toLowerCase().includes(q)
  )
})

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const loadCompanies = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } catch {
    showSnack('Error al cargar compañías', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editTarget.value = null
  form.value = emptyForm()
  nameError.value = ''
  showKey.value = false
  formDialog.value = true
}

const openEdit = (company) => {
  editTarget.value = company
  form.value = {
    name: company.name,
    address: company.address ?? '',
    country: company.country ?? '',
    email: company.email ?? '',
    phone: company.phone ?? '',
    api_base_url: company.api_base_url,
    api_subscription_key: '',
    is_active: company.is_active,
  }
  nameError.value = ''
  showKey.value = false
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
      if (form.value.address !== (original.address ?? '')) payload.address = form.value.address || null
      if (form.value.country !== (original.country ?? '')) payload.country = form.value.country || null
      if (form.value.email !== (original.email ?? '')) payload.email = form.value.email || null
      if (form.value.phone !== (original.phone ?? '')) payload.phone = form.value.phone || null
      if (form.value.api_base_url !== original.api_base_url) payload.api_base_url = form.value.api_base_url
      if (form.value.api_subscription_key) payload.api_subscription_key = form.value.api_subscription_key
      if (form.value.is_active !== original.is_active) payload.is_active = form.value.is_active

      const { data } = await apiClient.patch(`/companies/${original.id}`, payload)
      const idx = companies.value.findIndex(c => c.id === original.id)
      if (idx !== -1) companies.value[idx] = { ...companies.value[idx], ...data }
      showSnack('Compañía actualizada')
    } else {
      const { data } = await apiClient.post('/companies/', {
        name: form.value.name,
        address: form.value.address || null,
        country: form.value.country || null,
        email: form.value.email || null,
        phone: form.value.phone || null,
        api_base_url: form.value.api_base_url,
        api_subscription_key: form.value.api_subscription_key,
      })
      companies.value.unshift(data)
      showSnack('Compañía creada')
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

const confirmDelete = (company) => {
  deleteTarget.value = company
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    await apiClient.delete(`/companies/${deleteTarget.value.id}`)
    const idx = companies.value.findIndex(c => c.id === deleteTarget.value.id)
    if (idx !== -1) companies.value[idx] = { ...companies.value[idx], is_active: false }
    deleteDialog.value = false
    showSnack('Compañía desactivada')
  } catch {
    showSnack('Error al desactivar compañía', 'error')
  } finally {
    deleting.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
