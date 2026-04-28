<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Validación de Conductores</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de ejecución -->
    <v-card elevation="0" border class="mb-6">
      <v-card-text>
        <div class="d-flex align-center gap-3 flex-wrap">
          <v-select
            v-model="selectedCompanyId"
            :items="activeCompanies"
            item-title="name"
            item-value="id"
            placeholder="Seleccionar compañía..."
            variant="outlined"
            density="compact"
            hide-details
            :loading="loadingCompanies"
            style="max-width: 320px;"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-play"
            :disabled="!selectedCompanyId || running"
            :loading="running"
            @click="runValidation"
          >
            Ejecutar validación
          </v-btn>
          <v-btn
            v-if="result"
            variant="text"
            prepend-icon="mdi-close"
            @click="clearResults"
          >
            Limpiar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Estado inicial — sin ejecutar -->
    <div v-if="!result && !running" class="text-center py-12 text-medium-emphasis">
      <v-icon size="52" class="mb-3">mdi-account-search</v-icon>
      <div class="text-body-1">Selecciona una compañía y ejecuta la validación</div>
    </div>

    <!-- Resultados -->
    <template v-if="result">

      <!-- Resumen -->
      <v-row class="mb-4" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-account-multiple">
            {{ result.total_drivers }} conductores consultados
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip
            variant="tonal"
            :color="result.total_errors === 0 ? 'success' : 'error'"
            :prepend-icon="result.total_errors === 0 ? 'mdi-check-circle' : 'mdi-alert-circle'"
          >
            {{ result.total_errors === 0 ? 'Sin errores' : `${result.total_errors} errores encontrados` }}
          </v-chip>
        </v-col>
      </v-row>

      <!-- Sin errores -->
      <v-card v-if="result.total_errors === 0" elevation="0" border color="success" variant="tonal" class="mb-4">
        <v-card-text class="text-center py-8">
          <v-icon size="48" color="success" class="mb-2">mdi-check-circle</v-icon>
          <div class="text-body-1 font-weight-medium">Todos los registros son válidos</div>
        </v-card-text>
      </v-card>

      <!-- Tabla con errores -->
      <template v-else>
        <!-- Filtros por tipo + búsqueda -->
        <v-row class="mb-3" align="center" dense>
          <v-col cols="12" sm="auto">
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                :color="activeField === null ? 'primary' : undefined"
                :variant="activeField === null ? 'tonal' : 'outlined'"
                size="small"
                @click="activeField = null"
              >
                Todos ({{ result.results.length }})
              </v-chip>
              <v-chip
                v-for="{ field, count } in fieldCounts"
                :key="field"
                :color="activeField === field ? fieldColor(field) : undefined"
                :variant="activeField === field ? 'tonal' : 'outlined'"
                size="small"
                @click="activeField = field"
              >
                {{ field }} ({{ count }})
              </v-chip>
            </div>
          </v-col>
          <v-spacer />
          <v-col cols="12" sm="auto" class="d-flex gap-3">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Buscar..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 220px;"
            />
            <v-btn variant="tonal" prepend-icon="mdi-download" @click="exportCsv">
              Exportar CSV
            </v-btn>
          </v-col>
        </v-row>

        <!-- Tabla -->
        <v-card elevation="0" border>
          <v-data-table
            :headers="headers"
            :items="filteredResults"
            density="compact"
            items-per-page="25"
            hover
          >
            <template #item.callsign="{ item }">
              <code class="text-body-2">{{ item.callsign }}</code>
            </template>

            <template #item.field="{ item }">
              <v-chip :color="fieldColor(item.field)" size="x-small" variant="tonal">
                {{ item.field }}
              </v-chip>
            </template>

            <template #item.value="{ item }">
              <span class="text-body-2 text-medium-emphasis">{{ item.value || '—' }}</span>
            </template>

            <template #item.error="{ item }">
              <span class="text-body-2 text-error">{{ item.error }}</span>
            </template>

            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis">
                <v-icon size="36" class="mb-2">mdi-filter-off</v-icon>
                <div class="text-body-2">Sin resultados para este filtro</div>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </template>
    </template>

    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="5000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'

const companies = ref([])
const loadingCompanies = ref(false)
const selectedCompanyId = ref(null)
const running = ref(false)
const result = ref(null)
const search = ref('')
const activeField = ref(null)
const snack = ref({ show: false, text: '', color: 'error' })

const headers = [
  { title: 'Callsign',  key: 'callsign' },
  { title: 'Nombre',    key: 'full_name' },
  { title: 'Campo',     key: 'field' },
  { title: 'Valor',     key: 'value',   sortable: false },
  { title: 'Error',     key: 'error',   sortable: false },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const fieldColorMap = {
  authorization: 'error',
  email:         'primary',
  curp:          'warning',
  forename:      'info',
  surname:       'info',
  mobile:        'success',
  telephone:     'success',
  'city/region': 'secondary',
}
const fieldColor = (field) => fieldColorMap[field?.toLowerCase()] ?? 'secondary'

// Conteo dinámico por field
const fieldCounts = computed(() => {
  if (!result.value?.results) return []
  const map = {}
  for (const r of result.value.results) {
    map[r.field] = (map[r.field] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count)
})

const filteredResults = computed(() => {
  let items = result.value?.results ?? []
  if (activeField.value) items = items.filter(r => r.field === activeField.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(r =>
      r.callsign?.toLowerCase().includes(q) ||
      r.full_name?.toLowerCase().includes(q) ||
      r.error?.toLowerCase().includes(q)
    )
  }
  return items
})

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } catch {
    showSnack('Error al cargar compañías')
  } finally {
    loadingCompanies.value = false
  }
}

const runValidation = async () => {
  running.value = true
  result.value = null
  search.value = ''
  activeField.value = null
  try {
    const { data } = await apiClient.get('/tools/drivers/validate', {
      params: { company_id: selectedCompanyId.value }
    })
    result.value = data
  } catch (err) {
    const status = err.response?.status
    const companyName = activeCompanies.value.find(c => c.id === selectedCompanyId.value)?.name ?? ''
    if (status === 502 || status === 504) {
      showSnack(`No fue posible conectar con la API de ${companyName}. Verifica las credenciales.`)
    } else if (status === 403) {
      showSnack('Sin permiso para usar herramientas.')
    } else {
      const detail = err.response?.data?.detail
      showSnack(typeof detail === 'string' ? detail : 'Error al ejecutar la validación')
    }
  } finally {
    running.value = false
  }
}

const clearResults = () => {
  result.value = null
  search.value = ''
  activeField.value = null
  selectedCompanyId.value = null
}

const exportCsv = () => {
  const rows = filteredResults.value
  if (!rows.length) return
  const cols = ['driver_id', 'callsign', 'full_name', 'field', 'value', 'error']
  const csv = [
    cols.join(','),
    ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `validacion_${result.value?.company?.name ?? 'conductores'}_${Date.now()}.csv`
  a.click()
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
