<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="d-flex align-center justify-space-between mb-2 flex-wrap gap-2">
      <div class="text-h5 font-weight-bold">Histórico de Saldos</div>
      <v-btn
        variant="tonal"
        prepend-icon="mdi-text-box-search-outline"
        :disabled="!selectedCompanyId"
        @click="openLog"
      >
        Log de auditoría
      </v-btn>
    </div>
    <v-divider class="mb-6" color="warning" :thickness="2" style="max-width: 60px;" />

    <!-- Selector de compañía -->
    <v-card elevation="0" border class="mb-4">
      <v-card-text>
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
          @update:model-value="onCompanyChange"
        />
      </v-card-text>
    </v-card>

    <!-- Sin compañía -->
    <div
      v-if="!selectedCompanyId && !tools.historyLoading"
      class="text-center py-12 text-medium-emphasis"
    >
      <v-icon size="52" class="mb-3">mdi-history</v-icon>
      <div class="text-body-1">Selecciona una compañía para ver el histórico</div>
    </div>

    <!-- Tabla de sesiones -->
    <template v-if="selectedCompanyId">
      <v-card elevation="0" border class="mb-4">
        <v-data-table
          :headers="sessionHeaders"
          :items="tools.historySessions"
          density="compact"
          items-per-page="10"
          :loading="tools.historyLoading"
          hover
        >
          <template #item.fetched_at="{ item }">
            {{ formatDate(item.fetched_at) }}
          </template>
          <template #item.drivers_with_balance="{ item }">
            <span class="font-weight-medium">{{ item.drivers_with_balance }}</span>
          </template>
          <template #item.processed_count="{ item }">
            <span class="font-weight-medium">{{ item.processed_count }}</span>
          </template>
          <template #item.paid_count="{ item }">
            <v-chip
              :color="item.paid_count > 0 ? 'success' : 'secondary'"
              size="x-small"
              variant="tonal"
            >
              {{ item.paid_count }}
            </v-chip>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              size="x-small"
              variant="tonal"
              :color="selectedSession === item.session_id ? 'primary' : 'default'"
              @click="selectSession(item.session_id)"
            >
              Ver detalle
            </v-btn>
          </template>
          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon size="36" class="mb-2">mdi-database-off-outline</v-icon>
              <div class="text-body-2">No hay sesiones históricas para esta compañía</div>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Detalle de sesión -->
      <template v-if="selectedSession">
        <v-divider class="mb-4" />
        <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-3">
          <div class="text-subtitle-1 font-weight-bold">
            Detalle sesión: {{ sessionLabel }}
          </div>
          <div class="d-flex gap-2 align-center">
            <v-text-field
              v-model="searchDetail"
              prepend-inner-icon="mdi-magnify"
              placeholder="Buscar por nombre o notas..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 320px;"
            />
            <v-btn variant="tonal" prepend-icon="mdi-download" @click="exportHistoryCsv">
              Exportar CSV
            </v-btn>
          </div>
        </div>

        <div v-if="tools.historyLoading && !tools.historyDetail" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" class="mb-3" />
          <div class="text-body-2 text-medium-emphasis">Cargando detalle…</div>
        </div>

        <v-card v-else-if="tools.historyDetail" elevation="0" border>
          <v-data-table
            :headers="detailHeaders"
            :items="filteredDetail"
            density="compact"
            items-per-page="25"
            hover
          >
            <template #item.fullName="{ item }">
              {{ item.forename }} {{ item.surname }}
            </template>

            <template #item.account_type="{ item }">
              <v-chip
                :color="accountTypeColor(accountType(item.bank_sort_code))"
                size="x-small"
                variant="tonal"
              >
                {{ accountType(item.bank_sort_code) }}
              </v-chip>
            </template>

            <template #item.current_balance="{ item }">
              <span :class="balanceClass(item.current_balance)">
                {{ formatMoney(item.current_balance) }}
              </span>
            </template>

            <template #item.process_status="{ item }">
              <v-chip :color="statusColor(item.process_status)" size="x-small" variant="tonal">
                {{ statusLabel(item.process_status) }}
              </v-chip>
            </template>

            <template #item.process_balance_before="{ item }">
              {{ item.process_balance_before != null ? formatMoney(item.process_balance_before) : '—' }}
            </template>

            <template #item.payment_status="{ item }">
              <v-chip :color="paymentStatusColor(item.payment_status)" size="x-small" variant="tonal">
                {{ paymentStatusLabel(item.payment_status) }}
              </v-chip>
            </template>

            <template #item.webhook_status="{ item }">
              <v-chip :color="webhookStatusColor(item.webhook_status)" size="x-small" variant="tonal">
                {{ webhookStatusLabel(item.webhook_status) }}
              </v-chip>
            </template>

            <template #item.processed_at="{ item }">
              {{ item.processed_at ? formatDate(item.processed_at) : '—' }}
            </template>

            <template #item.webhook_received_at="{ item }">
              {{ item.webhook_received_at ? formatDate(item.webhook_received_at) : '—' }}
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
    </template>

    <!-- Drawer — Log de auditoría -->
    <v-navigation-drawer v-model="logDrawer" location="right" width="480" temporary>
      <v-toolbar density="compact" color="surface">
        <v-toolbar-title class="text-body-1 font-weight-bold">Log de auditoría</v-toolbar-title>
        <v-btn icon="mdi-close" @click="logDrawer = false" />
      </v-toolbar>

      <div v-if="tools.logLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <v-list v-else density="compact" lines="two">
        <v-list-item
          v-for="entry in tools.logEntries"
          :key="entry.id"
          :subtitle="formatDate(entry.created_at)"
        >
          <template #title>
            <v-chip :color="logColor(entry.event_type)" size="x-small" class="mr-2">
              {{ entry.event_type }}
            </v-chip>
            <span v-if="entry.driver_id" class="text-caption text-medium-emphasis">
              driver #{{ entry.driver_id }}
            </span>
          </template>
          <template #append>
            <v-tooltip v-if="entry.payload" location="left">
              <template #activator="{ props }">
                <v-icon v-bind="props" size="small">mdi-information-outline</v-icon>
              </template>
              <pre class="text-caption" style="max-width:300px;white-space:pre-wrap;">{{ JSON.stringify(entry.payload, null, 2) }}</pre>
            </v-tooltip>
          </template>
        </v-list-item>
        <v-list-item v-if="!tools.logLoading && tools.logEntries.length === 0">
          <v-list-item-title class="text-medium-emphasis text-body-2">
            Sin eventos registrados
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useToolsStore } from '@/stores/toolsStore'

const tools = useToolsStore()

const companies          = ref([])
const loadingCompanies   = ref(false)
const selectedCompanyId  = ref(null)
const selectedSession    = ref(null)
const searchDetail       = ref('')
const logDrawer          = ref(false)

const sessionHeaders = [
  { title: 'Fecha consulta', key: 'fetched_at',           align: 'start' },
  { title: 'Conductores',    key: 'drivers_with_balance', align: 'center' },
  { title: 'Procesados',     key: 'processed_count',      align: 'center' },
  { title: 'Pagados',        key: 'paid_count',           align: 'center' },
  { title: '',               key: 'actions',              align: 'center', sortable: false },
]

const detailHeaders = [
  { title: 'Callsign',         key: 'callsign',               sortable: true },
  { title: 'Nombre',           key: 'fullName',               sortable: true },
  { title: 'Banco',            key: 'bank_name',              sortable: true },
  { title: 'Cuenta / CLABE',   key: 'bank_sort_code',         sortable: true },
  { title: 'Tipo',             key: 'account_type',           align: 'center', sortable: false },
  { title: 'Saldo',            key: 'current_balance',        align: 'end', sortable: true },
  { title: 'Proceso',          key: 'process_status',         align: 'center', sortable: false },
  { title: 'Saldo verificado', key: 'process_balance_before', align: 'end', sortable: true },
  { title: 'Pago',             key: 'payment_status',         align: 'center', sortable: false },
  { title: 'Webhook',          key: 'webhook_status',         align: 'center', sortable: false },
  { title: 'Procesado',        key: 'processed_at',           sortable: true },
  { title: 'Confirmación',     key: 'webhook_received_at',    sortable: true },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const sessionLabel = computed(() => {
  const s = tools.historySessions.find(s => s.session_id === selectedSession.value)
  return s ? formatDate(s.fetched_at) : ''
})

const filteredDetail = computed(() => {
  const results = tools.historyDetail?.results ?? []
  if (!searchDetail.value) return results
  const q = searchDetail.value.toLowerCase()
  return results.filter(r =>
    `${r.forename} ${r.surname}`.toLowerCase().includes(q) ||
    r.notes?.toLowerCase().includes(q)
  )
})

// ── Helpers ────────────────────────────────────────────────────────────────

const accountType = (bankSortCode) => {
  const len = (bankSortCode ?? '').trim().length
  if (len === 16) return 'TDD'
  if (len === 18) return 'CLABE'
  return 'ERROR'
}
const accountTypeColor = (type) => ({ TDD: 'success', CLABE: 'primary' }[type] ?? 'error')

const formatMoney = (val) => {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)
}
const formatDate = (val) => {
  if (!val) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(val))
}
const balanceClass = (val) => {
  if (val > 500) return 'text-error font-weight-bold'
  if (val >= 50)  return 'text-warning font-weight-medium'
  return ''
}
const statusColor = (s) => ({ done: 'success', error: 'error', processing: 'primary' }[s] ?? 'secondary')
const statusLabel = (s) => ({ done: 'Procesado', error: 'Error', processing: 'Procesando…' }[s] ?? 'Pendiente')

const paymentStatusColor = (s) =>
  ({ success: 'success', pending: 'warning', error: 'error' }[s] ?? 'secondary')
const paymentStatusLabel = (s) =>
  ({ success: 'Pagado', pending: 'Pendiente pago', error: 'Error pago' }[s] ?? '—')

const webhookStatusColor = (s) => {
  if (!s) return 'secondary'
  if (s === 'Liquidada') return 'success'
  return 'warning'
}
const webhookStatusLabel = (s) => s ?? '—'

const logColor = (type) => ({
  refresh_start:     'primary',
  refresh_done:      'success',
  process_done:      'success',
  process_error:     'error',
  payment_initiated: 'warning',
  payment_error:     'error',
  webhook_received:  'info',
  webhook_error:     'error',
}[type] ?? 'secondary')

// ── Acciones ───────────────────────────────────────────────────────────────

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } finally {
    loadingCompanies.value = false
  }
}

const onCompanyChange = async (id) => {
  tools.clearHistory()
  selectedSession.value = null
  searchDetail.value    = ''
  if (id) await tools.loadHistorySessions(id)
}

const selectSession = async (sessionId) => {
  if (selectedSession.value === sessionId) {
    selectedSession.value = null
    return
  }
  selectedSession.value = sessionId
  searchDetail.value    = ''
  await tools.loadHistoryDetail(selectedCompanyId.value, sessionId)
}

const openLog = async () => {
  logDrawer.value = true
  await tools.loadPaymentLog(selectedCompanyId.value)
}

const exportHistoryCsv = () => {
  const rows = filteredDetail.value
  if (!rows.length) return
  const cols = [
    'callsign', 'driver_id', 'forename', 'surname',
    'bank_name', 'bank_sort_code', 'account_type', 'current_balance',
    'all_jobs_total', 'all_jobs_commission',
    'process_status', 'process_balance_before', 'processed_at',
    'payment_status', 'peibo_tracking_code', 'peibo_paid_at',
    'webhook_status', 'webhook_transaction_id', 'webhook_date_time',
    'webhook_amount', 'webhook_beneficiary_account',
    'webhook_originator_name', 'webhook_received_at',
    'notes'
  ]
  const csv = [
    cols.join(','),
    ...rows.map(r => {
      const extra = { ...r, account_type: accountType(r.bank_sort_code) }
      return cols.map(c => `"${String(extra[c] ?? '').replace(/"/g, '""')}"`).join(',')
    })
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `historico_${tools.historyDetail?.company?.name ?? 'saldos'}_${selectedSession.value}_${Date.now()}.csv`
  a.click()
}

onMounted(loadCompanies)
</script>
