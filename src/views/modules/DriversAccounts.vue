<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Saldos de Conductores</div>
    <v-divider class="mb-6" color="error" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de control -->
    <v-card elevation="0" border class="mb-4">
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
            @update:model-value="onCompanyChange"
          />

          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-refresh"
            :disabled="!selectedCompanyId || tools.accountsRefreshing || tools.accountsProcessing"
            :loading="tools.accountsRefreshing"
            @click="startRefresh"
          >
            Consultar saldos
          </v-btn>

          <v-btn
            color="warning"
            prepend-icon="mdi-play-circle"
            :disabled="!selectedCompanyId || tools.accountsProcessing || tools.accountsRefreshing || pendingCount === 0"
            :loading="tools.accountsProcessing"
            @click="confirmDialog = true"
          >
            Procesar pendientes ({{ pendingCount }})
          </v-btn>

          <v-btn
            v-if="auth.hasPermission('companies:update') && tools.accountsResult.company"
            color="deep-purple"
            prepend-icon="mdi-tray-arrow-up"
            :disabled="!selectedCompanyId || enqueuingBulk || tools.accountsRefreshing || enqueuableCount === 0"
            :loading="enqueuingBulk"
            @click="enqueueConfirmDialog = true"
          >
            Encolar todos ({{ enqueuableCount }})
          </v-btn>

          <v-btn
            v-if="tools.accountsResult.company"
            variant="text"
            prepend-icon="mdi-close"
            :disabled="tools.accountsRefreshing || tools.accountsProcessing"
            @click="clearAll"
          >
            Limpiar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Barra de progreso — Refresh SSE -->
    <v-card v-if="tools.accountsRefreshing" elevation="0" border class="mb-4 pa-4">
      <v-progress-linear
        :model-value="refreshPercent"
        color="primary" height="8" rounded class="mb-2"
      />
      <p class="text-caption text-medium-emphasis mb-0">
        Consultando: página {{ tools.accountsProgress.page }} / {{ tools.accountsProgress.total_pages }}
        <template v-if="tools.accountsProgress.total_pages">({{ refreshPercent }}%)</template>
        — {{ tools.accountsResult.drivers_with_balance }} conductores con saldo encontrados hasta ahora…
      </p>
    </v-card>

    <!-- Barra de progreso — Proceso masivo SSE -->
    <v-card v-if="tools.accountsProcessing" elevation="0" border class="mb-4 pa-4">
      <v-progress-linear
        :model-value="processPercent"
        color="warning" height="8" rounded class="mb-2"
      />
      <p class="text-caption text-medium-emphasis mb-0">
        Procesando: {{ tools.accountsProcessProgress.done }} / {{ tools.accountsProcessProgress.total }}
        <template v-if="tools.accountsProcessProgress.total">({{ processPercent }}%)</template>
        <span v-if="tools.accountsProcessProgress.errors > 0" class="text-error ml-1">
          · {{ tools.accountsProcessProgress.errors }} error{{ tools.accountsProcessProgress.errors !== 1 ? 'es' : '' }}
        </span>
      </p>
    </v-card>

    <!-- Cargando desde BD -->
    <div v-if="tools.accountsLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" class="mb-3" />
      <div class="text-body-2 text-medium-emphasis">Cargando datos guardados…</div>
    </div>

    <!-- Sin compañía seleccionada -->
    <div
      v-else-if="!selectedCompanyId && !tools.accountsResult.company"
      class="text-center py-12 text-medium-emphasis"
    >
      <v-icon size="52" class="mb-3">mdi-currency-usd-off</v-icon>
      <div class="text-body-1">Selecciona una compañía para ver los saldos</div>
    </div>

    <!-- Compañía seleccionada pero sin datos en BD -->
    <div
      v-else-if="tools.accountsResult.company && tools.accountsResult.results.length === 0 && !tools.accountsRefreshing"
      class="text-center py-12 text-medium-emphasis"
    >
      <v-icon size="52" class="mb-3">mdi-database-off-outline</v-icon>
      <div class="text-body-1 mb-1">No hay datos guardados para esta compañía</div>
      <div class="text-body-2">Pulsa "Consultar saldos" para obtenerlos</div>
    </div>

    <!-- Resultados -->
    <template v-if="tools.accountsResult.company && (tools.accountsResult.results.length > 0 || tools.accountsRefreshing)">

      <!-- Chips de resumen -->
      <v-row class="mb-4" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="secondary" size="small" prepend-icon="mdi-clock-outline">
            Última consulta: {{ formatDate(tools.accountsResult.fetched_at) }}
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip
            variant="tonal"
            :color="tools.accountsResult.drivers_with_balance === 0 ? 'success' : 'error'"
            size="small"
            :prepend-icon="tools.accountsResult.drivers_with_balance === 0 ? 'mdi-check-circle' : 'mdi-alert-circle'"
          >
            {{ tools.accountsResult.drivers_with_balance }} con saldo positivo
          </v-chip>
        </v-col>
        <v-col v-if="processedCount > 0" cols="auto">
          <v-chip variant="tonal" color="success" size="small" prepend-icon="mdi-check">
            {{ processedCount }} procesados
          </v-chip>
        </v-col>
      </v-row>

      <!-- Sin saldos tras terminar refresh -->
      <v-card
        v-if="!tools.accountsRefreshing && tools.accountsResult.drivers_with_balance === 0"
        elevation="0" border color="success" variant="tonal" class="mb-4"
      >
        <v-card-text class="text-center py-6">
          <v-icon size="40" color="success" class="mb-2">mdi-check-circle</v-icon>
          <div class="text-body-1 font-weight-medium">Ningún conductor tiene saldo pendiente</div>
        </v-card-text>
      </v-card>

      <!-- Tabla -->
      <template v-if="tools.accountsResult.results.length > 0">
        <v-row class="mb-3" align="center" dense>
          <v-col cols="12" sm style="min-width: 0;">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Buscar por nombre o notas..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 480px; width: 100%;"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn variant="tonal" prepend-icon="mdi-download" @click="exportCsv">
              Exportar CSV
            </v-btn>
          </v-col>
        </v-row>

        <v-card elevation="0" border>
          <v-data-table
            :headers="headers"
            :items="filteredAccounts"
            density="compact"
            items-per-page="25"
            hover
            :item-value="r => r.driver_id"
          >
            <!-- Nombre -->
            <template #item.fullName="{ item }">
              {{ item.forename }} {{ item.surname }}
            </template>

            <!-- Tipo de cuenta -->
            <template #item.account_type="{ item }">
              <v-chip
                :color="accountTypeColor(accountType(item.bank_sort_code))"
                size="x-small"
                variant="tonal"
              >
                {{ accountType(item.bank_sort_code) }}
              </v-chip>
            </template>

            <!-- Saldo actual (con color) -->
            <template #item.current_balance="{ item }">
              <span :class="balanceClass(item.current_balance)">
                {{ formatMoney(item.current_balance) }}
              </span>
            </template>

            <!-- Monedas -->
            <template #item.all_jobs_total="{ item }">
              {{ formatMoney(item.all_jobs_total) }}
            </template>
            <template #item.all_jobs_commission="{ item }">
              {{ formatMoney(item.all_jobs_commission) }}
            </template>
            <template #item.process_balance_before="{ item }">
              {{ item.process_balance_before != null ? formatMoney(item.process_balance_before) : '—' }}
            </template>

            <!-- Estado pago -->
            <template #item.payment_status="{ item }">
              <v-chip :color="paymentStatusColor(item.payment_status)" size="x-small" variant="tonal">
                {{ paymentStatusLabel(item.payment_status) }}
              </v-chip>
            </template>

            <!-- Estado proceso -->
            <template #item.process_status="{ item }">
              <v-tooltip
                v-if="item.process_result"
                :text="item.process_result.slice(0, 300)"
                location="top"
              >
                <template #activator="{ props }">
                  <v-chip v-bind="props" :color="statusColor(item.process_status)" size="x-small" variant="tonal">
                    {{ statusLabel(item.process_status) }}
                  </v-chip>
                </template>
              </v-tooltip>
              <v-chip v-else :color="statusColor(item.process_status)" size="x-small" variant="tonal">
                {{ statusLabel(item.process_status) }}
              </v-chip>
            </template>

            <!-- Fecha procesado -->
            <template #item.processed_at="{ item }">
              {{ item.processed_at ? formatDate(item.processed_at) : '—' }}
            </template>

            <!-- Botones por fila -->
            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="warning"
                  :loading="item.process_status === 'processing'"
                  :disabled="tools.accountsRefreshing || item.process_status === 'processing' || item.process_status === 'done'"
                  @click="processSingle(item)"
                >
                  Procesar
                </v-btn>
                <v-btn
                  v-if="auth.hasPermission('companies:update')"
                  size="x-small"
                  variant="tonal"
                  color="deep-purple"
                  prepend-icon="mdi-tray-arrow-up"
                  :loading="payingDrivers[item.driver_id]"
                  :disabled="
                    tools.accountsRefreshing ||
                    payingDrivers[item.driver_id] ||
                    item.payment_status === 'success' ||
                    item.payment_status === 'pending' ||
                    !item.process_balance_before ||
                    item.process_balance_before <= 0
                  "
                  @click="openPayConfirm(item)"
                >
                  {{ item.payment_status === 'success' ? 'Pagado' : item.payment_status === 'pending' ? 'En cola' : 'Encolar pago' }}
                </v-btn>
              </div>
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

    <!-- Diálogo de confirmación — proceso masivo -->
    <v-dialog v-model="confirmDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6 pa-4">Confirmar proceso masivo</v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          ¿Procesar <strong>{{ pendingCount }}</strong>
          conductor{{ pendingCount !== 1 ? 'es' : '' }} con saldo pendiente de
          <strong>{{ tools.accountsResult.company?.name }}</strong>?
          <br /><br />
          <v-alert type="warning" variant="tonal" density="compact">
            Esta acción es irreversible y puede tardar varios minutos.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">Cancelar</v-btn>
          <v-btn color="warning" variant="flat" @click="startProcess">
            Procesar {{ pendingCount }} conductores
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de confirmación — pago individual -->
    <v-dialog v-model="payConfirmDialog" max-width="480">
      <v-card v-if="payConfirmItem">
        <v-card-title class="text-h6 pa-4 d-flex align-center gap-2">
          <v-icon color="deep-purple" size="22">mdi-tray-arrow-up</v-icon>
          Encolar pago para aprobación
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">

          <v-list density="compact" class="pa-0">

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="secondary" class="mr-3">mdi-tag-outline</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Callsign / Driver ID</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1">
                {{ payConfirmItem.callsign }} · #{{ payConfirmItem.driver_id }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="secondary" class="mr-3">mdi-account</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Beneficiario</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1">
                {{ `${payConfirmItem.forename} ${payConfirmItem.surname}`.toUpperCase() }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="secondary" class="mr-3">mdi-bank</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Banco</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1">
                {{ payConfirmItem.bank_name }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="secondary" class="mr-3">mdi-credit-card-outline</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">
                Cuenta · <v-chip size="x-small" variant="tonal" :color="accountTypeColor(accountType(payConfirmItem.bank_sort_code))">{{ accountType(payConfirmItem.bank_sort_code) }}</v-chip>
              </v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1 font-monospace">
                {{ payConfirmItem.bank_sort_code }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="secondary" class="mr-3">mdi-office-building</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Compañía</v-list-item-title>
              <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1">
                {{ tools.accountsResult.company?.name }} · ID {{ selectedCompanyId }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-3" />

            <v-list-item class="px-0 py-1">
              <template #prepend>
                <v-icon size="18" color="deep-purple" class="mr-3">mdi-currency-usd</v-icon>
              </template>
              <v-list-item-title class="text-caption text-medium-emphasis">Monto a transferir</v-list-item-title>
              <v-list-item-subtitle class="text-h6 font-weight-bold text-deep-purple mt-1">
                {{ formatMoney(payConfirmItem.process_balance_before) }}
              </v-list-item-subtitle>
            </v-list-item>

          </v-list>

          <v-divider class="my-3" />

          <v-text-field
            v-model="payConfirmAmount"
            type="number"
            label="Monto a encolar"
            variant="outlined"
            density="compact"
            prefix="$"
            suffix="MXN"
            :min="0.01"
            hint="Puedes ajustar el monto antes de enviarlo a la cola"
            persistent-hint
          />

          <v-alert type="info" variant="tonal" density="compact" class="mt-4 text-body-2">
            El pago quedará <strong>pendiente de aprobación</strong> por la contadora antes de ejecutarse.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="payConfirmDialog = false">Cancelar</v-btn>
          <v-btn color="deep-purple" variant="flat" prepend-icon="mdi-tray-arrow-up" @click="confirmPay">
            Encolar pago
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de confirmación — encolar todos -->
    <v-dialog v-model="enqueueConfirmDialog" max-width="460">
      <v-card>
        <v-card-title class="text-h6 pa-4 d-flex align-center gap-2">
          <v-icon color="deep-purple" size="22">mdi-tray-arrow-up</v-icon>
          Encolar todos los pagos
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          ¿Encolar <strong>{{ enqueuableCount }}</strong>
          pago{{ enqueuableCount !== 1 ? 's' : '' }} de
          <strong>{{ tools.accountsResult.company?.name }}</strong>?
          <br /><br />
          <v-alert type="info" variant="tonal" density="compact">
            Los pagos quedarán en la cola de aprobación. La contadora deberá aprobarlos antes de que se ejecuten.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="enqueueConfirmDialog = false">Cancelar</v-btn>
          <v-btn color="deep-purple" variant="flat" prepend-icon="mdi-tray-arrow-up" @click="enqueueBulk">
            Encolar {{ enqueuableCount }} pagos
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="6000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'
import { useToolsStore } from '@/stores/toolsStore'
import { useAuthStore } from '@/stores/auth'

const tools = useToolsStore()
const auth  = useAuthStore()

const companies         = ref([])
const loadingCompanies  = ref(false)
const selectedCompanyId = ref(null)
const search            = ref('')
const confirmDialog       = ref(false)
const payConfirmDialog    = ref(false)
const payConfirmItem      = ref(null)
const payConfirmAmount    = ref('')
const enqueueConfirmDialog = ref(false)
const enqueuingBulk       = ref(false)
const snack             = ref({ show: false, text: '', color: 'error' })
const payingDrivers     = ref({})

const headers = [
  { title: 'Callsign',         key: 'callsign',             sortable: true },
  { title: 'Nombre',           key: 'fullName',             sortable: true },
  { title: 'Banco',            key: 'bank_name',            sortable: true },
  { title: 'Cuenta / CLABE',   key: 'bank_sort_code',       sortable: true },
  { title: 'Tipo',             key: 'account_type',         align: 'center', sortable: false },
  { title: 'Saldo actual',     key: 'current_balance',      align: 'end', sortable: true },
  { title: 'Total viajes',     key: 'all_jobs_total',       align: 'end', sortable: true },
  { title: 'Comisión',         key: 'all_jobs_commission',  align: 'end', sortable: true },
  { title: 'Estado',           key: 'process_status',       align: 'center' },
  { title: 'Pago',            key: 'payment_status',       align: 'center', sortable: false },
  { title: 'Saldo verificado', key: 'process_balance_before', align: 'end', sortable: true },
  { title: 'Procesado',        key: 'processed_at',         sortable: true },
  { title: '',                 key: 'actions',              sortable: false, width: '160px' },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const pendingCount = computed(() =>
  tools.accountsResult.results.filter(r => r.process_status === null).length
)
const enqueuableCount = computed(() =>
  tools.accountsResult.results.filter(r =>
    r.process_balance_before > 0 &&
    r.payment_status !== 'success' &&
    r.payment_status !== 'pending'
  ).length
)
const processedCount = computed(() =>
  tools.accountsResult.results.filter(r => r.process_status === 'done').length
)

const refreshPercent = computed(() => {
  const { page, total_pages } = tools.accountsProgress
  return total_pages ? Math.round((page / total_pages) * 100) : 0
})
const processPercent = computed(() => {
  const { done, total } = tools.accountsProcessProgress
  return total ? Math.round((done / total) * 100) : 0
})

const filteredAccounts = computed(() => {
  const items = tools.accountsResult.results
  if (!search.value) return items
  const q = search.value.toLowerCase()
  return items.filter(r =>
    `${r.forename} ${r.surname}`.toLowerCase().includes(q) ||
    r.notes?.toLowerCase().includes(q)
  )
})

// ── Tipo de cuenta ─────────────────────────────────────────────────────────

const accountType = (bankSortCode) => {
  const len = (bankSortCode ?? '').trim().length
  if (len === 16) return 'TDD'
  if (len === 18) return 'CLABE'
  return 'ERROR'
}
const accountTypeColor = (type) => ({ TDD: 'success', CLABE: 'primary' }[type] ?? 'error')

// ── Formatters ─────────────────────────────────────────────────────────────

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

// ── Acciones ─────────────────────────────────────────────────────────────

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

const onCompanyChange = async (id) => {
  tools.clearAccounts()
  search.value = ''
  if (id) await tools.loadStoredAccounts(id)
}

const clearAll = () => {
  tools.clearAccounts()
  selectedCompanyId.value = null
  search.value = ''
}

const startRefresh = async () => {
  search.value = ''
  await tools.refreshAccounts(selectedCompanyId.value, auth.token)
  if (tools.accountsError) handleError(tools.accountsError)
}

const startProcess = async () => {
  confirmDialog.value = false
  await tools.processBulk(selectedCompanyId.value)
}

const processSingle = async (item) => {
  try {
    await tools.processSingleDriver(selectedCompanyId.value, item.driver_id)
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al procesar el conductor')
  }
}

const openPayConfirm = (item) => {
  payConfirmItem.value   = item
  payConfirmAmount.value = String(item.process_balance_before ?? '')
  payConfirmDialog.value = true
}

const confirmPay = () => {
  payConfirmDialog.value = false
  const amount = parseFloat(payConfirmAmount.value)
  paySingle(payConfirmItem.value, isNaN(amount) || amount <= 0 ? null : amount)
}

const paySingle = async (item, amount = null) => {
  payingDrivers.value[item.driver_id] = true
  try {
    const body = amount != null ? { amount } : null
    await apiClient.post(
      `/payments/transfer/driver/${item.driver_id}`,
      body,
      { params: { company_id: selectedCompanyId.value } },
    )
    const row = tools.accountsResult.results.find(r => r.driver_id === item.driver_id)
    if (row) row.payment_status = 'pending'
    showSnack('Pago encolado correctamente — pendiente de aprobación', 'success')
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al encolar el pago', 'error')
  } finally {
    delete payingDrivers.value[item.driver_id]
  }
}

const enqueueBulk = async () => {
  enqueueConfirmDialog.value = false
  enqueuingBulk.value = true
  const eligible = tools.accountsResult.results.filter(r =>
    r.process_balance_before > 0 &&
    r.payment_status !== 'success' &&
    r.payment_status !== 'pending'
  )
  let success = 0
  let errors = 0
  await Promise.allSettled(eligible.map(async (item) => {
    try {
      await apiClient.post(
        `/payments/transfer/driver/${item.driver_id}`,
        null,
        { params: { company_id: selectedCompanyId.value } },
      )
      const row = tools.accountsResult.results.find(r => r.driver_id === item.driver_id)
      if (row) row.payment_status = 'pending'
      success++
    } catch {
      errors++
    }
  }))
  enqueuingBulk.value = false
  if (errors === 0) {
    showSnack(`${success} pago${success !== 1 ? 's' : ''} encolado${success !== 1 ? 's' : ''} correctamente — pendientes de aprobación`, 'success')
  } else {
    showSnack(`${success} encolado${success !== 1 ? 's' : ''}, ${errors} error${errors !== 1 ? 'es' : ''}`, 'warning')
  }
}

const handleError = (err) => {
  const name = activeCompanies.value.find(c => c.id === selectedCompanyId.value)?.name ?? ''
  if (err.code === 502 || err.code === 504)
    showSnack(`No fue posible conectar con la API de ${name}. Verifica las credenciales.`)
  else if (err.code === 403)
    showSnack('Sin permiso para usar herramientas.')
  else
    showSnack(err.detail ?? 'Error inesperado')
}

const exportCsv = () => {
  const rows = filteredAccounts.value
  if (!rows.length) return
  const cols = ['callsign', 'driver_id', 'fullName',
                 'bank_name', 'bank_sort_code', 'account_type', 'current_balance',
                 'all_jobs_total', 'all_jobs_commission',
                 'notes', 'process_status', 'process_balance_before', 'processed_at']
  const csv = [
    cols.join(','),
    ...rows.map(r => {
      const extra = {
        ...r,
        account_type: accountType(r.bank_sort_code),
        fullName: `${r.forename} ${r.surname}`.toUpperCase(),
      }
      return cols.map(c => {
        const val = String(extra[c] ?? '').replace(/"/g, '""')
        if (c === 'bank_sort_code') return `"'${val}"`
        return `"${val}"`
      }).join(',')
    })
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `saldos_${tools.accountsResult.company?.name ?? 'conductores'}_${Date.now()}.csv`
  a.click()
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
