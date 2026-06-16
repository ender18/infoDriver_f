<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Bonos Conductores</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de controles -->
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
            style="max-width: 280px;"
            @update:model-value="clearResults"
          />
          <v-text-field
            v-model="dateFrom"
            type="date"
            label="Desde"
            variant="outlined"
            density="compact"
            hide-details
            :max="dateTo || undefined"
            style="max-width: 180px;"
          />
          <v-text-field
            v-model="dateTo"
            type="date"
            label="Hasta"
            variant="outlined"
            density="compact"
            hide-details
            :min="dateFrom || undefined"
            style="max-width: 180px;"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-trophy"
            :disabled="!canQuery || loadingDaily"
            :loading="loadingDaily"
            @click="fetchDaily"
          >
            Bonos diarios
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-flag-checkered"
            :disabled="!canQuery || loadingFirstTrip"
            :loading="loadingFirstTrip"
            @click="fetchFirstTrip"
          >
            Primeros viajes
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Estado inicial -->
    <div v-if="!activeView && !loadingDaily && !loadingFirstTrip" class="text-center py-12 text-medium-emphasis">
      <v-icon size="52" class="mb-3">mdi-trophy-outline</v-icon>
      <div class="text-body-1">Selecciona una compañía, rango de fechas y tipo de bono</div>
    </div>

    <!-- ── Vista Bonos Diarios ── -->
    <template v-if="activeView === 'daily' && dailyResult">

      <!-- Plan de bonos -->
      <v-row class="mb-4" dense align="center">
        <v-col cols="auto">
          <span class="text-caption text-medium-emphasis">Plan:</span>
        </v-col>
        <v-col v-for="(level, i) in dailyCumulativeLevels" :key="i" cols="auto">
          <v-chip size="small" variant="tonal" :color="levelColor(i + 1)">
            ≥{{ level.trips }} completados/día → {{ fmtMXN(level.cumulative) }}
          </v-chip>
        </v-col>
        <v-col v-if="dailyResult.bonus_config?.first_trip_bonus" cols="auto">
          <v-chip size="small" variant="tonal" color="amber">
            Primeros viajes → {{ fmtMXN(dailyResult.bonus_config.first_trip_bonus) }}
          </v-chip>
        </v-col>
      </v-row>

      <!-- Chips resumen + export -->
      <v-row class="mb-4" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="teal" prepend-icon="mdi-account-group">
            {{ dailyResult.total_drivers_with_bonus }} conductores con bono
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="amber" prepend-icon="mdi-cash">
            Total: {{ fmtMXN(dailyResult.total_bonus_amount) }} MXN
          </v-chip>
        </v-col>
        <v-spacer />
        <v-col v-if="dailyResult.drivers.length" cols="auto">
          <v-btn variant="tonal" prepend-icon="mdi-microsoft-excel" @click="exportDailyCsv">
            Exportar Excel
          </v-btn>
        </v-col>
      </v-row>

      <!-- Sin conductores -->
      <v-card v-if="!dailyResult.drivers.length" elevation="0" border>
        <v-card-text class="text-center py-10">
          <v-icon size="48" color="medium-emphasis" class="mb-2">mdi-trophy-outline</v-icon>
          <div class="text-body-1">Ningún conductor obtuvo bono en este periodo</div>
        </v-card-text>
      </v-card>

      <!-- Tabla conductores con expansión -->
      <v-card v-else elevation="0" border>
        <v-data-table
          :headers="dailyHeaders"
          :items="dailyResult.drivers"
          item-value="callsign"
          v-model:expanded="dailyExpanded"
          show-expand
          density="compact"
          items-per-page="25"
          hover
        >
          <template #item.callsign="{ item }">
            <code class="text-body-2">{{ item.callsign }}</code>
          </template>

          <template #item.days_count="{ item }">
            <v-chip size="x-small" variant="tonal" color="teal">
              {{ item.days.length }}
            </v-chip>
          </template>

          <template #item.total_bonus="{ item }">
            <v-chip size="x-small" variant="tonal" color="amber">
              {{ fmtMXN(item.total_bonus) }} MXN
            </v-chip>
          </template>

          <template #expanded-row="{ item, columns }">
            <tr>
              <td :colspan="columns.length" class="pa-3">
                <v-card elevation="0" border rounded="lg">
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center gap-2 mb-3">
                      <v-icon size="16" color="teal">mdi-calendar-check</v-icon>
                      <span class="text-body-2 font-weight-medium">
                        Días con bono — <strong>{{ item.full_name }}</strong>
                      </span>
                      <v-chip size="x-small" variant="tonal" color="teal" class="ml-1">
                        {{ item.days.length }} día{{ item.days.length !== 1 ? 's' : '' }}
                      </v-chip>
                    </div>
                    <v-data-table
                      :headers="dayDetailHeaders"
                      :items="item.days"
                      item-value="date"
                      density="compact"
                      hide-default-footer
                      :items-per-page="-1"
                    >
                      <template #item.date="{ item: day }">
                        <span class="text-body-2">{{ fmtDateShort(day.date) }}</span>
                      </template>

                      <template #item.completed_trips="{ item: day }">
                        <span class="text-body-2 font-weight-medium">{{ day.completed_trips }}</span>
                      </template>

                      <template #item.level_reached="{ item: day }">
                        <v-chip size="x-small" variant="tonal" :color="levelColor(day.level_reached)">
                          {{ levelLabel(day.level_reached) }}
                        </v-chip>
                      </template>

                      <template #item.bonus="{ item: day }">
                        <span class="text-body-2 font-weight-bold">{{ fmtMXN(day.bonus) }}</span>
                      </template>

                      <template #bottom />
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </td>
            </tr>
          </template>

          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon size="36" class="mb-2">mdi-filter-off</v-icon>
              <div class="text-body-2">Sin resultados</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- ── Vista Primeros N Viajes ── -->
    <template v-if="activeView === 'first-trip' && firstTripResult">

      <!-- Plan de bonos -->
      <v-row class="mb-4" dense align="center">
        <v-col cols="auto">
          <span class="text-caption text-medium-emphasis">Plan:</span>
        </v-col>
        <v-col v-for="(level, i) in firstTripCumulativeLevels" :key="i" cols="auto">
          <v-chip size="small" variant="tonal" :color="levelColor(i + 1)">
            ≥{{ level.trips }} completados/día → {{ fmtMXN(level.cumulative) }}
          </v-chip>
        </v-col>
        <v-col v-if="firstTripResult.first_trips_bonus" cols="auto">
          <v-chip size="small" variant="tonal" color="amber">
            Primeros {{ firstTripResult.first_trips_count }} viajes → {{ fmtMXN(firstTripResult.first_trips_bonus) }}
          </v-chip>
        </v-col>
      </v-row>

      <!-- Chips resumen + subtítulo + export -->
      <v-row class="mb-2" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="secondary" prepend-icon="mdi-account-plus">
            {{ firstTripResult.total_drivers }} conductores calificados
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="amber" prepend-icon="mdi-cash">
            Total: {{ fmtMXN(firstTripResult.total_bonus_amount) }} MXN
          </v-chip>
        </v-col>
        <v-spacer />
        <v-col v-if="firstTripResult.drivers.length" cols="auto">
          <v-btn variant="tonal" prepend-icon="mdi-microsoft-excel" @click="exportFirstTripCsv">
            Exportar Excel
          </v-btn>
        </v-col>
      </v-row>

      <div class="text-caption text-medium-emphasis mb-4">
        Conductores que completaron su viaje #{{ firstTripResult.first_trips_count }} histórico en este periodo
      </div>

      <!-- Sin conductores -->
      <v-card v-if="!firstTripResult.drivers.length" elevation="0" border>
        <v-card-text class="text-center py-10">
          <v-icon size="48" color="medium-emphasis" class="mb-2">mdi-flag-checkered</v-icon>
          <div class="text-body-1">
            Ningún conductor alcanzó su viaje #{{ firstTripResult.first_trips_count }} en este periodo
          </div>
        </v-card-text>
      </v-card>

      <!-- Tabla primeros viajes -->
      <v-card v-else elevation="0" border>
        <v-data-table
          :headers="firstTripHeaders"
          :items="firstTripResult.drivers"
          item-value="callsign"
          density="compact"
          items-per-page="25"
          hover
        >
          <template #item.callsign="{ item }">
            <code class="text-body-2">{{ item.callsign }}</code>
          </template>

          <template #item.qualifying_trip_at="{ item }">
            <span class="text-body-2">{{ fmtDate(item.qualifying_trip_at) }}</span>
          </template>

          <template #item.bonus="{ item }">
            <v-chip size="x-small" variant="tonal" color="amber">
              {{ fmtMXN(item.bonus) }}
            </v-chip>
          </template>

          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon size="36" class="mb-2">mdi-filter-off</v-icon>
              <div class="text-body-2">Sin resultados</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
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
const loadingDaily = ref(false)
const loadingFirstTrip = ref(false)
const dailyResult = ref(null)
const firstTripResult = ref(null)
const activeView = ref(null)
const dailyExpanded = ref([])
const snack = ref({ show: false, text: '', color: 'error' })

const getMondayOfWeek = () => {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}
const dateFrom = ref(getMondayOfWeek())
const dateTo   = ref(new Date().toISOString().slice(0, 10))

const dailyHeaders = [
  { title: 'Callsign',      key: 'callsign' },
  { title: 'Nombre',        key: 'full_name' },
  { title: 'Días con bono', key: 'days_count', align: 'center' },
  { title: 'Total bono',    key: 'total_bonus', align: 'center' },
]

const dayDetailHeaders = [
  { title: 'Fecha',              key: 'date' },
  { title: 'Viajes completados', key: 'completed_trips', align: 'center' },
  { title: 'Nivel',              key: 'level_reached',   align: 'center' },
  { title: 'Bono del día',       key: 'bonus',           align: 'center' },
]

const firstTripHeaders = computed(() => [
  { title: 'Callsign',            key: 'callsign' },
  { title: 'Nombre',              key: 'full_name' },
  { title: 'Teléfono',            key: 'mobile' },
  { title: `Viaje #${firstTripResult.value?.first_trips_count ?? 'N'} (clasificatorio)`, key: 'qualifying_trip_at' },
  { title: 'Bono',                key: 'bonus', align: 'center' },
])

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const canQuery = computed(() =>
  !!selectedCompanyId.value && !!dateFrom.value && !!dateTo.value && !loadingDaily.value && !loadingFirstTrip.value
)

const dailyCumulativeLevels = computed(() => {
  const trips = dailyResult.value?.bonus_config?.daily_trips ?? []
  let acc = 0
  return trips.map(t => { acc += t.bonus; return { trips: t.trips, cumulative: acc } })
})

const firstTripCumulativeLevels = computed(() => {
  const trips = firstTripResult.value?.bonus_config?.daily_trips ?? []
  let acc = 0
  return trips.map(t => { acc += t.bonus; return { trips: t.trips, cumulative: acc } })
})

const levelColor = (level) => {
  const colors = ['teal', 'green', 'amber', 'orange', 'deep-purple']
  return colors[level - 1] ?? 'deep-purple'
}

const levelLabel = (level) => {
  const l = dailyCumulativeLevels.value[level - 1]
  return l ? `Nv.${level} · ${fmtMXN(l.cumulative)}` : `Nv.${level}`
}

const fmtMXN = (n) => {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString('es-MX')}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const fmtDateShort = (d) => {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const clearResults = () => {
  dailyResult.value = null
  firstTripResult.value = null
  activeView.value = null
  dailyExpanded.value = []
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

const fetchDaily = async () => {
  loadingDaily.value = true
  dailyResult.value = null
  dailyExpanded.value = []
  activeView.value = 'daily'
  try {
    const { data } = await apiClient.get('/bonuses/drivers/daily', {
      params: { company_id: selectedCompanyId.value, date_from: dateFrom.value, date_to: dateTo.value }
    })
    dailyResult.value = data
  } catch (err) {
    activeView.value = null
    const status = err.response?.status
    if (status === 403) {
      showSnack('Sin permiso para consultar bonos.')
    } else {
      const detail = err.response?.data?.detail
      showSnack(typeof detail === 'string' ? detail : 'Error al consultar bonos diarios')
    }
  } finally {
    loadingDaily.value = false
  }
}

const fetchFirstTrip = async () => {
  loadingFirstTrip.value = true
  firstTripResult.value = null
  activeView.value = 'first-trip'
  try {
    const { data } = await apiClient.get('/bonuses/drivers/first-trip', {
      params: { company_id: selectedCompanyId.value, date_from: dateFrom.value, date_to: dateTo.value }
    })
    firstTripResult.value = data
  } catch (err) {
    activeView.value = null
    const status = err.response?.status
    if (status === 403) {
      showSnack('Sin permiso para consultar bonos.')
    } else {
      const detail = err.response?.data?.detail
      showSnack(typeof detail === 'string' ? detail : 'Error al consultar bonos de primeros viajes')
    }
  } finally {
    loadingFirstTrip.value = false
  }
}

const downloadCsv = (rows, headers, filename) => {
  const headerRow = headers.map(h => `"${h}"`).join(',')
  const dataRows = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  const csv = '﻿' + [headerRow, ...dataRows].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = filename
  a.click()
}

const exportDailyCsv = () => {
  const company = dailyResult.value?.company?.name ?? 'compania'
  const rows = []
  for (const driver of dailyResult.value.drivers) {
    for (const day of driver.days) {
      rows.push({
        callsign:        driver.callsign,
        nombre:          driver.full_name,
        telefono:        driver.mobile ?? '',
        fecha:           day.date,
        viajes_completados: day.completed_trips,
        nivel_alcanzado: day.level_reached,
        bono_dia:        day.bonus,
        bono_total:      driver.total_bonus,
      })
    }
  }
  downloadCsv(
    rows,
    ['Callsign', 'Nombre', 'Teléfono', 'Fecha', 'Viajes completados', 'Nivel alcanzado', 'Bono del día (MXN)', 'Bono total (MXN)'],
    `bonos_diarios_${company}_${dateFrom.value}_${dateTo.value}.csv`
  )
}

const exportFirstTripCsv = () => {
  const company = firstTripResult.value?.company?.name ?? 'compania'
  const count = firstTripResult.value?.first_trips_count ?? 'N'
  const rows = firstTripResult.value.drivers.map(d => ({
    callsign:             d.callsign,
    nombre:               d.full_name,
    telefono:             d.mobile ?? '',
    viaje_clasificatorio: d.qualifying_trip_at ?? '',
    bono:                 d.bonus,
  }))
  downloadCsv(
    rows,
    ['Callsign', 'Nombre', 'Teléfono', `Viaje #${count} (clasificatorio)`, 'Bono (MXN)'],
    `bonos_primeros_${count}_viajes_${company}_${dateFrom.value}_${dateTo.value}.csv`
  )
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
