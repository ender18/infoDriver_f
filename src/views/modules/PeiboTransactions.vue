<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Transacciones PEIBO</div>
    <v-divider class="mb-6" color="deep-purple" :thickness="2" style="max-width: 60px;" />

    <!-- Filtros -->
    <v-card elevation="0" border class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedCompanyId"
              :items="activeCompanies"
              item-title="name"
              item-value="id"
              placeholder="Compañía..."
              variant="outlined"
              density="compact"
              hide-details
              :loading="loadingCompanies"
              @update:model-value="onFilterChange"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-select
              v-model="filterStatus"
              :items="statusOptions"
              placeholder="Estado..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="onFilterChange"
            />
          </v-col>
          <v-col cols="12" sm="3">
            <v-select
              v-model="filterSourceType"
              :items="sourceTypeOptions"
              placeholder="Tipo de origen..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              @update:model-value="onFilterChange"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Sin compañía seleccionada -->
    <div v-if="!selectedCompanyId && !loading" class="text-center py-12 text-medium-emphasis">
      <v-icon size="52" class="mb-3">mdi-bank-transfer</v-icon>
      <div class="text-body-1">Selecciona una compañía para ver las transacciones</div>
    </div>

    <!-- Tabla -->
    <v-card v-if="selectedCompanyId" elevation="0" border>
      <v-data-table-server
        :headers="headers"
        :items="transactions"
        :items-length="totalItems"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :items-per-page-options="[25, 50, 100]"
        density="compact"
        hover
        @update:options="onTableOptions"
      >
        <template #item.tracking_code="{ item }">
          <span class="font-weight-medium text-caption" style="font-family: monospace;">
            {{ item.tracking_code }}
          </span>
        </template>

        <template #item.callsign="{ item }">
          <code v-if="item.callsign" class="text-caption">{{ item.callsign }}</code>
          <span v-else class="text-medium-emphasis">—</span>
        </template>

        <template #item.beneficiary_name="{ item }">
          <span class="text-body-2">{{ item.beneficiary_name ?? '—' }}</span>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="txStatusColor(item.status)" size="x-small" variant="tonal">
            {{ txStatusLabel(item.status) }}
          </v-chip>
        </template>

        <template #item.amount="{ item }">
          <span class="font-weight-medium">{{ formatMoney(item.amount) }}</span>
        </template>

        <template #item.source_type="{ item }">
          <v-chip size="x-small" variant="outlined">
            {{ sourceTypeLabel(item.source_type) }}
          </v-chip>
        </template>

        <template #item.webhook_count="{ item }">
          <v-chip
            v-if="item.webhook_events?.length"
            :color="item.webhook_events.some(w => w.status === 'Liquidada') ? 'success' : 'warning'"
            size="x-small"
            variant="tonal"
          >
            {{ item.webhook_events.length }}
          </v-chip>
          <span v-else class="text-medium-emphasis">—</span>
        </template>

        <template #item.paid_at="{ item }">
          {{ item.paid_at ? formatDate(item.paid_at) : '—' }}
        </template>

        <template #item.created_at="{ item }">
          {{ formatDate(item.created_at) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn size="x-small" variant="tonal" @click="openDetail(item)">
            Ver
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            <v-icon size="36" class="mb-2">mdi-bank-off-outline</v-icon>
            <div class="text-body-2">Sin transacciones para estos filtros</div>
          </div>
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Drawer — Detalle de transacción -->
    <v-navigation-drawer v-model="detailDrawer" location="right" width="560" temporary>
      <v-toolbar density="compact" color="surface">
        <v-toolbar-title class="text-body-1 font-weight-bold">Detalle de transacción</v-toolbar-title>
        <v-tooltip text="Ver log de auditoría" location="bottom">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-text-box-search-outline" @click="openAuditLog" />
          </template>
        </v-tooltip>
        <v-btn icon="mdi-close" @click="detailDrawer = false" />
      </v-toolbar>

      <div v-if="!selectedTx" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else class="pa-4">
        <!-- Datos principales -->
        <v-list density="compact" lines="two" class="mb-2">
          <v-list-item title="ID" :subtitle="String(selectedTx.id)" />
          <v-list-item title="Tracking Code">
            <template #subtitle>
              <span style="font-family: monospace;" class="text-caption font-weight-medium">
                {{ selectedTx.tracking_code }}
              </span>
            </template>
          </v-list-item>
          <v-list-item title="Transaction ID">
            <template #subtitle>
              <span style="font-family: monospace;" class="text-caption">
                {{ selectedTx.transaction_id ?? '—' }}
              </span>
            </template>
          </v-list-item>
          <v-list-item v-if="selectedTx.callsign" title="Callsign">
            <template #subtitle>
              <code class="text-caption">{{ selectedTx.callsign }}</code>
            </template>
          </v-list-item>
          <v-list-item v-if="selectedTx.beneficiary_name" title="Beneficiario" :subtitle="selectedTx.beneficiary_name" />
          <v-list-item title="Estado">
            <template #subtitle>
              <v-chip :color="txStatusColor(selectedTx.status)" size="x-small" variant="tonal" class="mt-1">
                {{ txStatusLabel(selectedTx.status) }}
              </v-chip>
            </template>
          </v-list-item>
          <v-list-item title="Monto" :subtitle="formatMoney(selectedTx.amount)" />
          <v-list-item v-if="selectedTx.original_amount != null" title="Monto original" :subtitle="formatMoney(selectedTx.original_amount)" />
          <v-list-item title="Tipo de origen" :subtitle="sourceTypeLabel(selectedTx.source_type)" />
          <v-list-item v-if="selectedTx.source_id" title="Source ID" :subtitle="String(selectedTx.source_id)" />
          <v-list-item title="Creado" :subtitle="formatDate(selectedTx.created_at)" />
          <v-list-item v-if="selectedTx.paid_at" title="Pagado" :subtitle="formatDate(selectedTx.paid_at)" />
          <v-list-item v-if="selectedTx.error_message" title="Error">
            <template #subtitle>
              <span class="text-error text-caption">{{ selectedTx.error_message }}</span>
            </template>
          </v-list-item>
        </v-list>

        <v-divider class="my-3" />

        <!-- Webhook events -->
        <div class="text-subtitle-2 font-weight-bold mb-3">
          Eventos webhook
          <v-chip v-if="selectedTx.webhook_events?.length" size="x-small" class="ml-1">
            {{ selectedTx.webhook_events.length }}
          </v-chip>
        </div>

        <div v-if="!selectedTx.webhook_events?.length" class="text-caption text-medium-emphasis">
          Sin eventos webhook recibidos
        </div>

        <v-card
          v-for="we in selectedTx.webhook_events"
          :key="we.id"
          elevation="0"
          border
          class="mb-2 pa-3"
        >
          <div class="d-flex align-center gap-2 mb-2">
            <v-chip :color="webhookStatusColor(we.status)" size="x-small" variant="tonal">
              {{ we.status }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">
              {{ we.type }} · {{ formatDate(we.received_at) }}
            </span>
          </div>
          <v-row dense class="text-caption">
            <v-col cols="6">
              <span class="text-medium-emphasis">Monto:</span> {{ formatMoney(we.amount) }}
            </v-col>
            <v-col cols="6">
              <span class="text-medium-emphasis">Referencia:</span> {{ we.reference ?? '—' }}
            </v-col>
            <v-col cols="12">
              <span class="text-medium-emphasis">Originante:</span> {{ we.originator_name ?? '—' }}
            </v-col>
            <v-col cols="12">
              <span class="text-medium-emphasis">Concepto:</span> {{ we.concept ?? '—' }}
            </v-col>
            <v-col v-if="we.refund_reason_code" cols="12">
              <span class="text-medium-emphasis text-warning">Motivo devolución:</span> {{ we.refund_reason_code }}
            </v-col>
          </v-row>
        </v-card>
      </div>
    </v-navigation-drawer>

    <!-- Drawer — Log de auditoría de la transacción -->
    <v-navigation-drawer v-model="logDrawer" location="right" width="480" temporary>
      <v-toolbar density="compact" color="surface">
        <v-btn icon="mdi-arrow-left" @click="logDrawer = false; detailDrawer = true" />
        <v-toolbar-title class="text-body-1 font-weight-bold">Log de auditoría</v-toolbar-title>
        <v-btn icon="mdi-close" @click="logDrawer = false" />
      </v-toolbar>

      <div v-if="logLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <v-list v-else density="compact" lines="two">
        <v-list-item
          v-for="entry in logEntries"
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
        <v-list-item v-if="!logLoading && logEntries.length === 0">
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

const companies        = ref([])
const loadingCompanies = ref(false)

const selectedCompanyId = ref(null)
const filterStatus      = ref(null)
const filterSourceType  = ref(null)

const transactions = ref([])
const totalItems   = ref(0)
const loading      = ref(false)
const itemsPerPage = ref(50)

const detailDrawer = ref(false)
const selectedTx   = ref(null)

const logDrawer  = ref(false)
const logLoading = ref(false)
const logEntries = ref([])

const statusOptions = [
  { title: 'Pendiente', value: 'pending'  },
  { title: 'Exitosa',   value: 'success'  },
  { title: 'Fallida',   value: 'failed'   },
  { title: 'Devuelta',  value: 'refunded' },
]

const sourceTypeOptions = [
  { title: 'Pago conductor', value: 'driver_payment' },
  { title: 'Cola de pagos',  value: 'payment_queue'  },
  { title: 'Manual',         value: 'manual'         },
]

const headers = [
  { title: 'Tracking',     key: 'tracking_code',  sortable: false },
  { title: 'Callsign',     key: 'callsign',        sortable: false },
  { title: 'Beneficiario', key: 'beneficiary_name', sortable: false },
  { title: 'Estado',       key: 'status',          align: 'center', sortable: false },
  { title: 'Monto',        key: 'amount',          align: 'end',    sortable: false },
  { title: 'Origen',       key: 'source_type',     align: 'center', sortable: false },
  { title: 'Webhooks',     key: 'webhook_count',   align: 'center', sortable: false },
  { title: 'Pagado',       key: 'paid_at',         sortable: false },
  { title: 'Creado',       key: 'created_at',      sortable: false },
  { title: '',             key: 'actions',         align: 'center', sortable: false },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

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

const txStatusColor = (s) =>
  ({ success: 'success', pending: 'warning', failed: 'error', refunded: 'info' }[s] ?? 'secondary')

const txStatusLabel = (s) =>
  ({ success: 'Liquidada', pending: 'Pendiente', failed: 'Fallida', refunded: 'Devuelta' }[s] ?? s ?? '—')

const sourceTypeLabel = (s) =>
  ({ driver_payment: 'Conductor', payment_queue: 'Cola de pagos', manual: 'Manual' }[s] ?? s ?? '—')

const webhookStatusColor = (s) => {
  if (!s) return 'secondary'
  if (s === 'Liquidada') return 'success'
  if (s === 'Devuelta')  return 'info'
  if (s === 'Rechazada') return 'error'
  return 'warning'
}

const logColor = (type) => ({
  payment_initiated: 'warning',
  payment_error:     'error',
  webhook_received:  'info',
  webhook_error:     'error',
}[type] ?? 'secondary')

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } finally {
    loadingCompanies.value = false
  }
}

const loadTransactions = async (offset = 0) => {
  if (!selectedCompanyId.value) return
  loading.value = true
  try {
    const params = { company_id: selectedCompanyId.value, limit: itemsPerPage.value, offset }
    if (filterStatus.value)     params.status      = filterStatus.value
    if (filterSourceType.value) params.source_type = filterSourceType.value
    const { data } = await apiClient.get('/payments/transactions', { params })
    transactions.value = data.results
    totalItems.value   = data.total
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => loadTransactions(0)

const onTableOptions = ({ page, itemsPerPage: ipp }) => {
  itemsPerPage.value = ipp
  loadTransactions((page - 1) * ipp)
}

const openDetail = (tx) => {
  selectedTx.value   = tx
  detailDrawer.value = true
}

const openAuditLog = async () => {
  if (!selectedTx.value) return
  detailDrawer.value = false
  logDrawer.value    = true
  logLoading.value   = true
  logEntries.value   = []
  try {
    const { data } = await apiClient.get(`/payments/transactions/${selectedTx.value.id}/log`)
    logEntries.value = data
  } finally {
    logLoading.value = false
  }
}

onMounted(loadCompanies)
</script>
