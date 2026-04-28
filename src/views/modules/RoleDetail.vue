<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/roles')">
        Volver a Roles
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Detalle de Rol</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-row v-if="role">
      <!-- Info del rol -->
      <v-col cols="12" md="4">
        <v-card elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex align-center gap-3 mb-4">
              <v-chip :color="roleColor(role.name)" variant="tonal">{{ role.name }}</v-chip>
              <v-chip :color="role.is_active ? 'success' : 'error'" size="small" variant="tonal">
                {{ role.is_active ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{ role.description || 'Sin descripción' }}
            </div>
            <v-divider class="mb-3" />
            <v-list density="compact" lines="two">
              <v-list-item prepend-icon="mdi-calendar" title="Creado" :subtitle="formatDate(role.created_at)" />
              <v-list-item prepend-icon="mdi-update" title="Actualizado" :subtitle="formatDate(role.updated_at)" />
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Permisos -->
      <v-col cols="12" md="8">
        <v-card elevation="0" border>
          <v-card-title class="text-body-1 font-weight-bold pa-4 pb-2">Permisos asignados</v-card-title>
          <v-card-text>
            <!-- Asignar permiso -->
            <div v-if="auth.hasPermission('roles:update')" class="d-flex gap-2 mb-4">
              <v-select
                v-model="selectedPerm"
                :items="availablePerms"
                item-title="name"
                item-value="id"
                placeholder="Asignar permiso..."
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 320px;"
              />
              <v-btn
                :disabled="!selectedPerm"
                :loading="assigning"
                color="primary"
                variant="tonal"
                @click="assignPerm"
              >
                Asignar
              </v-btn>
            </div>

            <!-- Permisos agrupados por recurso -->
            <div v-if="role.permissions?.length">
              <div v-for="(perms, resource) in groupedPerms" :key="resource" class="mb-4">
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase mb-2">
                  {{ resource }}
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="perm in perms"
                    :key="perm.id"
                    :color="resourceColor(resource)"
                    variant="tonal"
                    size="small"
                    :closable="auth.hasPermission('roles:update')"
                    @click:close="confirmRemovePerm(perm)"
                  >
                    {{ perm.action }}
                  </v-chip>
                </div>
              </div>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis py-2">
              Sin permisos asignados
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirm quitar permiso -->
    <v-dialog v-model="removePermDialog" max-width="360">
      <v-card>
        <v-card-title class="text-body-1 font-weight-bold pt-5 px-5">Quitar permiso</v-card-title>
        <v-card-text class="px-5 text-body-2 text-medium-emphasis">
          ¿Quitar <strong>{{ removePermTarget?.name }}</strong> de este rol?
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="removePermDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="tonal" :loading="removing" @click="doRemovePerm">Quitar</v-btn>
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
import { useRoute } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const route = useRoute()
const role = ref(null)
const allPerms = ref([])
const loading = ref(false)
const selectedPerm = ref(null)
const assigning = ref(false)
const removePermDialog = ref(false)
const removePermTarget = ref(null)
const removing = ref(false)
const snack = ref({ show: false, text: '', color: 'success' })

const availablePerms = computed(() =>
  allPerms.value.filter(p => !role.value?.permissions?.some(rp => rp.id === p.id))
)

const groupedPerms = computed(() => {
  if (!role.value?.permissions) return {}
  return role.value.permissions.reduce((acc, p) => {
    ;(acc[p.resource] ??= []).push(p)
    return acc
  }, {})
})

const roleColorMap = { superadmin: 'error', admin: 'warning', moderator: 'info', user: 'success' }
const roleColor = (name) => roleColorMap[name?.toLowerCase()] ?? 'secondary'

const resourceColors = ['primary', 'secondary', 'indigo', 'teal', 'deep-purple', 'blue-grey', 'cyan', 'brown']
const resourceColorCache = {}
const resourceColor = (resource) => {
  if (!resourceColorCache[resource]) {
    const idx = Object.keys(resourceColorCache).length % resourceColors.length
    resourceColorCache[resource] = resourceColors[idx]
  }
  return resourceColorCache[resource]
}

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const loadRole = async () => {
  loading.value = true
  try {
    const [roleRes, permsRes] = await Promise.all([
      apiClient.get(`/roles/${route.params.id}`),
      apiClient.get('/permissions/', { params: { skip: 0, limit: 500 } }),
    ])
    role.value = roleRes.data
    allPerms.value = permsRes.data
  } catch {
    showSnack('Error al cargar rol', 'error')
  } finally {
    loading.value = false
  }
}

const assignPerm = async () => {
  assigning.value = true
  try {
    await apiClient.post(`/roles/${role.value.id}/permissions/${selectedPerm.value}`)
    const perm = allPerms.value.find(p => p.id === selectedPerm.value)
    role.value.permissions.push(perm)
    selectedPerm.value = null
    showSnack('Permiso asignado')
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al asignar permiso', 'error')
  } finally {
    assigning.value = false
  }
}

const confirmRemovePerm = (perm) => {
  removePermTarget.value = perm
  removePermDialog.value = true
}

const doRemovePerm = async () => {
  removing.value = true
  try {
    await apiClient.delete(`/roles/${role.value.id}/permissions/${removePermTarget.value.id}`)
    role.value.permissions = role.value.permissions.filter(p => p.id !== removePermTarget.value.id)
    removePermDialog.value = false
    showSnack('Permiso removido')
  } catch {
    showSnack('Error al remover permiso', 'error')
  } finally {
    removing.value = false
  }
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

onMounted(loadRole)
</script>
