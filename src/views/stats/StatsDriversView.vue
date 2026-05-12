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
            variant="tonal"
            color="success"
            prepend-icon="mdi-file-excel"
            :disabled="stats.isLoadingDrivers"
            @click="exportResumen"
          >
            Exportar resumen
          </v-btn>
          <v-btn
            v-if="stats.driversResult"
            variant="tonal"
            color="teal"
            prepend-icon="mdi-table-large"
            :disabled="stats.isLoadingDrivers"
            @click="exportDias"
          >
            Exportar 15 días
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

      <!-- Buscador + toggle días -->
      <div class="d-flex align-center gap-3 mb-2 flex-wrap">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Buscar por nombre o callsign..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 400px;"
        />
        <v-btn
          variant="tonal"
          size="small"
          :prepend-icon="showAllColumns ? 'mdi-calendar-minus' : 'mdi-calendar-plus'"
          @click="showAllColumns = !showAllColumns"
        >
          {{ showAllColumns ? 'Ver 5 días' : 'Ver 15 días' }}
        </v-btn>
      </div>

      <!-- Leyenda -->
      <div class="d-flex align-center gap-4 mb-3 text-caption text-medium-emphasis">
        <span><span class="text-success font-weight-bold">■</span> Completadas</span>
        <span><span class="text-error font-weight-bold">■</span> Canceladas</span>
      </div>

      <!-- Tabla principal — :key fuerza remount al cambiar columnas -->
      <v-card elevation="0" border>
        <v-data-table
          :key="tableKey"
          :headers="headers"
          :items="filteredDrivers"
          item-value="id"
          density="compact"
          :items-per-page="25"
          hover
        >
          <template #item="{ item, columns }">
            <tr class="v-data-table__tr">
              <td
                v-for="col in columns"
                :key="col.key"
                class="v-data-table__td"
                :class="col.align === 'center' ? 'text-center' : ''"
              >
                <!-- Callsign -->
                <template v-if="col.key === 'callsign'">
                  <span class="font-weight-medium">{{ item.callsign }}</span>
                </template>

                <!-- Nombre -->
                <template v-else-if="col.key === 'full_name'">
                  <div class="d-flex align-center gap-2">
                    {{ item.full_name }}
                    <v-chip v-if="item.last15_total === 0" size="x-small" color="secondary" variant="tonal">
                      Sin actividad
                    </v-chip>
                  </div>
                </template>

                <!-- Últ.15d completadas -->
                <template v-else-if="col.key === 'last15_completed'">
                  <span class="text-success font-weight-medium">{{ item.last15_completed }}</span>
                </template>

                <!-- Últ.15d canceladas -->
                <template v-else-if="col.key === 'last15_cancelled'">
                  <span :class="item.last15_cancelled > 0 ? 'text-error' : ''">{{ item.last15_cancelled }}</span>
                </template>

                <!-- Últ.15d total -->
                <template v-else-if="col.key === 'last15_total'">
                  <span class="font-weight-bold">{{ item.last15_total }}</span>
                </template>

                <!-- Último booking -->
                <template v-else-if="col.key === 'last_booking_at'">
                  <span class="text-medium-emphasis text-caption">{{ formatDatetime(item.last_booking_at) }}</span>
                </template>

                <!-- Columna de día -->
                <template v-else-if="col.key.startsWith('day_')">
                  <div style="line-height: 1.3;">
                    <template v-if="item[col.key]?.total > 0">
                      <div class="text-success text-caption font-weight-medium">{{ item[col.key].completed }}</div>
                      <div class="text-error text-caption">{{ item[col.key].cancelled }}</div>
                    </template>
                    <span v-else class="text-disabled text-caption">—</span>
                  </div>
                </template>

                <!-- Default (all_time.*, mobile, etc.) -->
                <template v-else>{{ getNestedValue(item, col.key) }}</template>
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

const companies         = ref([])
const loadingCompanies  = ref(false)
const selectedCompanyId = ref(null)
const search            = ref('')
const showAllColumns    = ref(false)
const snack             = ref({ show: false, text: '', color: 'error' })

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const tableDrivers = computed(() => {
  if (!stats.driversResult) return []
  return stats.driversResult.drivers.map(d => {
    const dayData = {}
    d.last_15_days.forEach(day => { dayData[`day_${day.date}`] = day })
    return {
      ...d,
      ...dayData,
      last15_completed: d.last_15_days.reduce((s, x) => s + x.completed, 0),
      last15_cancelled: d.last_15_days.reduce((s, x) => s + x.cancelled, 0),
      last15_total:     d.last_15_days.reduce((s, x) => s + x.total, 0),
    }
  })
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

const dayHeaders = computed(() => {
  const first = tableDrivers.value[0]
  if (!first) return []
  const days = [...first.last_15_days].reverse()
  const visible = showAllColumns.value ? days : days.slice(0, 5)
  return visible.map(day => ({
    title:    formatDayShort(day.date),
    key:      `day_${day.date}`,
    align:    'center',
    sortable: false,
  }))
})

const headers = computed(() => [
  { title: 'Callsign',       key: 'callsign',          sortable: true  },
  { title: 'Conductor',      key: 'full_name',          sortable: true  },
  { title: 'Teléfono',       key: 'mobile',             sortable: false },
  { title: 'Últ.15d Comp.',  key: 'last15_completed',   align: 'center', sortable: true },
  { title: 'Últ.15d Canc.',  key: 'last15_cancelled',   align: 'center', sortable: true },
  { title: 'Últ.15d Total',  key: 'last15_total',       align: 'center', sortable: true },
  { title: 'Hist. Comp.',    key: 'all_time.completed', align: 'center', sortable: true },
  { title: 'Hist. Canc.',    key: 'all_time.cancelled', align: 'center', sortable: true },
  { title: 'Hist. Total',    key: 'all_time.total',     align: 'center', sortable: true },
  { title: 'Último booking', key: 'last_booking_at',    sortable: true  },
  ...dayHeaders.value,
])

// Fuerza remount de v-data-table cuando cambian las columnas de días
const tableKey = computed(() => `table-${dayHeaders.value.map(h => h.key).join('-')}`)

// Accede a propiedades anidadas tipo "all_time.completed"
const getNestedValue = (obj, path) =>
  path.split('.').reduce((acc, key) => acc?.[key], obj) ?? ''

const formatDayShort = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit',
  })

const formatDatetime = (val) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(val))
}

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
  search.value = ''
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
  showAllColumns.value    = false
}

const downloadCSV = (lines, filename) => {
  const csv  = '﻿' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const exportResumen = () => {
  const drivers     = tableDrivers.value
  const companyName = activeCompanies.value.find(c => c.id === selectedCompanyId.value)?.name ?? 'empresa'
  const escape      = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const row         = (cols) => cols.map(escape).join(',')

  const lines = [
    row(['Callsign', 'Conductor', 'Teléfono', 'Últ.15d Comp.', 'Últ.15d Canc.', 'Últ.15d Total', 'Hist. Comp.', 'Hist. Canc.', 'Hist. Total', 'Último Booking']),
  ]
  for (const d of drivers) {
    lines.push(row([
      d.callsign, d.full_name, d.mobile,
      d.last15_completed, d.last15_cancelled, d.last15_total,
      d.all_time?.completed ?? 0, d.all_time?.cancelled ?? 0, d.all_time?.total ?? 0,
      d.last_booking_at ? formatDatetime(d.last_booking_at) : '—',
    ]))
  }

  downloadCSV(lines, `resumen_conductores_${companyName}_${new Date().toISOString().slice(0, 10)}.csv`)
}

const exportDias = () => {
  const drivers     = tableDrivers.value
  const companyName = activeCompanies.value.find(c => c.id === selectedCompanyId.value)?.name ?? 'empresa'
  const escape      = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const row         = (cols) => cols.map(escape).join(',')

  // Días más reciente primero, usando el primer conductor como referencia
  const days = drivers[0] ? [...drivers[0].last_15_days].reverse() : []

  // Cabecera: columnas fijas + por cada día tres columnas (Comp / Canc / Total)
  const dayTitles = days.flatMap(d => [`${d.date} Comp.`, `${d.date} Canc.`, `${d.date} Total`])
  const lines = [row(['Callsign', 'Conductor', 'Teléfono', ...dayTitles])]

  for (const d of drivers) {
    const orderedDays = [...d.last_15_days].reverse()
    const dayCells = orderedDays.flatMap(day => [day.completed, day.cancelled, day.total])
    lines.push(row([d.callsign, d.full_name, d.mobile, ...dayCells]))
  }

  downloadCSV(lines, `15dias_conductores_${companyName}_${new Date().toISOString().slice(0, 10)}.csv`)
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
