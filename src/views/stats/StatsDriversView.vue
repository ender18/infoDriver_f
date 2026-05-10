<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Stats Conductores</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de control -->
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
            prepend-icon="mdi-refresh"
            :disabled="!selectedCompanyId || stats.isLoadingDrivers"
            :loading="stats.isLoadingDrivers"
            @click="fetchData"
          >
            Actualizar
          </v-btn>
          <v-btn
            v-if="stats.driversResult"
            variant="text"
            prepend-icon="mdi-close"
            :disabled="stats.isLoadingDrivers"
            @click="clearAll"
          >
            Limpiar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Skeleton loader -->
    <template v-if="stats.isLoadingDrivers">
      <v-row class="mb-4" dense>
        <v-col v-for="n in 4" :key="n" cols="6" sm="3">
          <v-skeleton-loader type="chip" />
        </v-col>
      </v-row>
      <v-skeleton-loader type="table" />
    </template>

    <!-- Resultado -->
    <template v-else-if="stats.driversResult">

      <!-- Chips de resumen -->
      <v-row class="mb-4" dense>
        <v-col cols="6" sm="3">
          <v-chip color="primary" variant="tonal" size="large" class="w-100 justify-center">
            <span class="font-weight-bold me-1">{{ summary.total }}</span> Total conductores
          </v-chip>
        </v-col>
        <v-col cols="6" sm="3">
          <v-chip color="success" variant="tonal" size="large" class="w-100 justify-center">
            <span class="font-weight-bold me-1">{{ summary.active }}</span> Activos 15d
          </v-chip>
        </v-col>
        <v-col cols="6" sm="3">
          <v-chip color="secondary" variant="tonal" size="large" class="w-100 justify-center">
            <span class="font-weight-bold me-1">{{ summary.completed15.toLocaleString() }}</span> Completadas 15d
          </v-chip>
        </v-col>
        <v-col cols="6" sm="3">
          <v-chip color="error" variant="tonal" size="large" class="w-100 justify-center">
            <span class="font-weight-bold me-1">{{ summary.cancelled15.toLocaleString() }}</span> Canceladas 15d
          </v-chip>
        </v-col>
      </v-row>

      <!-- Buscador -->
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Buscar por nombre o callsign..."
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="mb-4"
        style="max-width: 400px;"
      />

      <!-- Tabla principal -->
      <v-card elevation="0" border>
        <v-data-table
          v-model:expanded="expanded"
          :headers="headers"
          :items="filteredDrivers"
          item-value="id"
          density="compact"
          expand-on-click
          show-expand
          :items-per-page="25"
          hover
        >
          <!-- Callsign -->
          <template #item.callsign="{ item }">
            <span class="font-weight-medium">{{ item.callsign }}</span>
          </template>

          <!-- Nombre con chip sin actividad -->
          <template #item.full_name="{ item }">
            <div class="d-flex align-center gap-2">
              {{ item.full_name }}
              <v-chip v-if="item.last15_total === 0" size="x-small" color="secondary" variant="tonal">
                Sin actividad
              </v-chip>
            </div>
          </template>

          <!-- Últ. 15d completadas -->
          <template #item.last15_completed="{ item }">
            <span class="text-success font-weight-medium">{{ item.last15_completed }}</span>
          </template>

          <!-- Últ. 15d canceladas -->
          <template #item.last15_cancelled="{ item }">
            <span :class="item.last15_cancelled > 0 ? 'text-error' : ''">{{ item.last15_cancelled }}</span>
          </template>

          <!-- Últ. 15d total -->
          <template #item.last15_total="{ item }">
            <span class="font-weight-bold">{{ item.last15_total }}</span>
          </template>

          <!-- Último booking -->
          <template #item.last_booking_at="{ item }">
            <span class="text-medium-emphasis text-caption">{{ formatDatetime(item.last_booking_at) }}</span>
          </template>

          <!-- Fila expandida — desglose por día -->
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0">
                <div class="pa-4 bg-surface-variant">
                  <div class="text-caption font-weight-bold mb-2 text-medium-emphasis">
                    DESGLOSE ÚLTIMOS 15 DÍAS — {{ item.callsign }} {{ item.full_name }}
                  </div>
                  <v-table density="compact" class="rounded">
                    <thead>
                      <tr>
                        <th class="text-left">Fecha</th>
                        <th class="text-center">Completadas</th>
                        <th class="text-center">Canceladas</th>
                        <th class="text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="day in item.last_15_days"
                        :key="day.date"
                        :class="day.total === 0 ? 'text-disabled' : ''"
                      >
                        <td>{{ formatDay(day.date) }}</td>
                        <td class="text-center">
                          <span :class="day.completed > 0 ? 'text-success font-weight-medium' : ''">
                            {{ day.completed }}
                          </span>
                        </td>
                        <td class="text-center">
                          <span :class="day.cancelled > 0 ? 'text-error' : ''">
                            {{ day.cancelled }}
                          </span>
                        </td>
                        <td class="text-center font-weight-bold">{{ day.total }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon size="36" class="mb-2">mdi-filter-off</v-icon>
              <div class="text-body-2">Sin resultados para esta búsqueda</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Estado vacío -->
    <v-empty-state
      v-else
      icon="mdi-account-group"
      title="Selecciona una compañía"
      text="El resumen de conductores aparecerá aquí."
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="6000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useStatsStore } from '@/stores/statsStore'

const stats = useStatsStore()

const companies          = ref([])
const loadingCompanies   = ref(false)
const selectedCompanyId  = ref(null)
const search             = ref('')
const expanded           = ref([])
const snack              = ref({ show: false, text: '', color: 'error' })

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

// Drivers con campos pre-calculados para ordenamiento nativo
const tableDrivers = computed(() => {
  if (!stats.driversResult) return []
  return stats.driversResult.drivers.map(d => ({
    ...d,
    last15_completed: d.last_15_days.reduce((s, x) => s + x.completed, 0),
    last15_cancelled: d.last_15_days.reduce((s, x) => s + x.cancelled, 0),
    last15_total:     d.last_15_days.reduce((s, x) => s + x.total, 0),
  }))
})

const filteredDrivers = computed(() => {
  if (!search.value) return tableDrivers.value
  const q = search.value.toLowerCase()
  return tableDrivers.value.filter(d =>
    d.callsign?.toLowerCase().includes(q) ||
    d.full_name?.toLowerCase().includes(q)
  )
})

const summary = computed(() => {
  const drivers = tableDrivers.value
  return {
    total:       stats.driversResult?.total_drivers ?? 0,
    active:      drivers.filter(d => d.last15_total > 0).length,
    completed15: drivers.reduce((s, d) => s + d.last15_completed, 0),
    cancelled15: drivers.reduce((s, d) => s + d.last15_cancelled, 0),
  }
})

const headers = [
  { title: 'Callsign',        key: 'callsign',         sortable: true  },
  { title: 'Conductor',       key: 'full_name',         sortable: true  },
  { title: 'Teléfono',        key: 'mobile',            sortable: false },
  { title: 'Últ.15d Comp.',   key: 'last15_completed',  align: 'center', sortable: true },
  { title: 'Últ.15d Canc.',   key: 'last15_cancelled',  align: 'center', sortable: true },
  { title: 'Últ.15d Total',   key: 'last15_total',      align: 'center', sortable: true },
  { title: 'Hist. Comp.',     key: 'all_time.completed', align: 'center', sortable: true },
  { title: 'Hist. Canc.',     key: 'all_time.cancelled', align: 'center', sortable: true },
  { title: 'Hist. Total',     key: 'all_time.total',     align: 'center', sortable: true },
  { title: 'Último booking',  key: 'last_booking_at',   sortable: true  },
]

const formatDatetime = (val) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(val))
}

const formatDay = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric'
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

const fetchData = async () => {
  search.value   = ''
  expanded.value = []
  try {
    await stats.fetchDriversSummary(selectedCompanyId.value)
  } catch (err) {
    const status = err.response?.status
    const name   = activeCompanies.value.find(c => c.id === selectedCompanyId.value)?.name ?? ''
    if (status === 502 || status === 504)
      showSnack(`No fue posible conectar con la API de ${name}. Verifica las credenciales.`)
    else if (status === 404)
      showSnack('Compañía no encontrada.')
    else
      showSnack(err.response?.data?.detail ?? 'Error inesperado')
  }
}

const clearAll = () => {
  stats.clearDrivers()
  selectedCompanyId.value = null
  search.value            = ''
  expanded.value          = []
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
