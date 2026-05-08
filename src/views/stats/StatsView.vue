<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Estadísticas de Reservas</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de control -->
    <v-card elevation="0" border class="mb-6">
      <v-card-text>
        <div class="d-flex align-center gap-3 flex-wrap">
          <v-text-field
            v-model="dateFrom"
            type="date"
            label="Desde"
            variant="outlined"
            density="compact"
            hide-details
            :max="dateTo || undefined"
            style="max-width: 200px;"
          />
          <v-text-field
            v-model="dateTo"
            type="date"
            label="Hasta"
            variant="outlined"
            density="compact"
            hide-details
            :min="dateFrom || undefined"
            style="max-width: 200px;"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-magnify"
            :disabled="!dateFrom || !dateTo || stats.isLoading"
            :loading="stats.isLoading"
            @click="consultar"
          >
            Consultar
          </v-btn>
          <v-btn
            v-if="stats.result"
            variant="tonal"
            prepend-icon="mdi-download"
            @click="exportCSV"
          >
            Exportar CSV
          </v-btn>
          <v-btn
            v-if="stats.result"
            variant="text"
            prepend-icon="mdi-close"
            :disabled="stats.isLoading"
            @click="stats.clear()"
          >
            Limpiar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Cargando -->
    <v-skeleton-loader v-if="stats.isLoading" type="card, table" />

    <!-- Resultado -->
    <template v-else-if="stats.result">

      <!-- KPI cards -->
      <v-row class="mb-6">
        <v-col v-for="kpi in kpis" :key="kpi.key" cols="6" sm="3">
          <v-card :color="kpi.color" variant="tonal" rounded="lg" class="text-center pa-4" height="100%">
            <div class="text-h3 font-weight-bold">
              {{ stats.result.summary[kpi.key].toLocaleString() }}
            </div>
            <div class="text-caption mt-1">{{ kpi.label }}</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabla por día (solo si hay más de un día) -->
      <template v-if="stats.result.by_day.length > 1">
        <div class="text-subtitle-1 font-weight-medium mb-3">Desglose por día</div>
        <v-card elevation="0" border>
          <v-data-table
            :headers="headers"
            :items="stats.result.by_day"
            density="compact"
            hide-default-footer
            :items-per-page="-1"
          >
            <template #item.date="{ item }">
              {{ formatDate(item.date) }}
            </template>
            <template #item.completed="{ item }">
              <span class="text-success font-weight-medium">{{ item.completed.toLocaleString() }}</span>
            </template>
            <template #item.cancelled="{ item }">
              <span class="text-error font-weight-medium">{{ item.cancelled.toLocaleString() }}</span>
            </template>
            <template #item.total="{ item }">
              <span class="font-weight-bold">{{ item.total.toLocaleString() }}</span>
            </template>
            <template #item.unique_vehicles="{ item }">
              <v-chip size="x-small" color="secondary" variant="tonal">
                {{ item.unique_vehicles }}
              </v-chip>
            </template>

            <!-- Fila de totales -->
            <template #body.append>
              <tr class="font-weight-bold" style="background: rgba(var(--v-theme-surface-variant), 0.4);">
                <td class="text-medium-emphasis text-caption ps-4">TOTAL</td>
                <td class="text-center text-success">{{ stats.result.summary.completed.toLocaleString() }}</td>
                <td class="text-center text-error">{{ stats.result.summary.cancelled.toLocaleString() }}</td>
                <td class="text-center">{{ stats.result.summary.total.toLocaleString() }}</td>
                <td class="text-center">{{ stats.result.summary.unique_vehicles.toLocaleString() }}</td>
              </tr>
            </template>

            <template #no-data>
              <div class="text-center py-6 text-medium-emphasis">Sin datos para este rango</div>
            </template>
          </v-data-table>
        </v-card>
      </template>
    </template>

    <!-- Estado vacío inicial -->
    <v-empty-state
      v-else
      icon="mdi-chart-bar"
      title="Selecciona un rango de fechas"
      text="El resumen y el desglose por día aparecerán aquí."
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="6000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { useStatsStore } from '@/stores/statsStore'

const stats = useStatsStore()

const today        = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

const dateFrom = ref(firstOfMonth.toISOString().slice(0, 10))
const dateTo   = ref(today.toISOString().slice(0, 10))
const snack    = ref({ show: false, text: '', color: 'error' })

const kpis = [
  { key: 'completed',       label: 'Completadas',      color: 'success'   },
  { key: 'cancelled',       label: 'Canceladas',        color: 'error'     },
  { key: 'total',           label: 'Total',             color: 'primary'   },
  { key: 'unique_vehicles', label: 'Vehículos únicos',  color: 'secondary' },
]

const headers = [
  { title: 'Fecha',            key: 'date',            align: 'start'  },
  { title: 'Completadas',      key: 'completed',       align: 'center' },
  { title: 'Canceladas',       key: 'cancelled',       align: 'center' },
  { title: 'Total',            key: 'total',           align: 'center' },
  { title: 'Vehículos únicos', key: 'unique_vehicles', align: 'center' },
]

const formatDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

const consultar = async () => {
  await stats.fetchBookingsSummary(dateFrom.value, dateTo.value)
  if (stats.error) showError(stats.error)
}

const showError = ({ code, detail }) => {
  if (code === 502)
    snack.value = { show: true, text: 'No fue posible conectar con la base de datos de Autocab.', color: 'error' }
  else if (code === 422)
    snack.value = { show: true, text: 'El rango de fechas no es válido.', color: 'warning' }
  else
    snack.value = { show: true, text: detail || 'Error inesperado', color: 'error' }
}

const exportCSV = () => {
  const cols = ['date', 'completed', 'cancelled', 'total', 'unique_vehicles']
  const rows = stats.result.by_day.map(r =>
    cols.map(c => `"${r[c] ?? ''}"`).join(',')
  )
  const totals = cols.map(c =>
    c === 'date' ? '"TOTAL"' : `"${stats.result.summary[c] ?? ''}"`
  ).join(',')
  const csv  = [cols.join(','), ...rows, totals].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `stats_${stats.result.date_from}_${stats.result.date_to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

watch(() => stats.error, (err) => { if (err) showError(err) })
</script>
