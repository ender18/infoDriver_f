<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Cola de Pagos</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Controles -->
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
            style="max-width: 175px;"
          />
          <v-text-field
            v-model="dateTo"
            type="date"
            label="Hasta"
            variant="outlined"
            density="compact"
            hide-details
            :min="dateFrom || undefined"
            style="max-width: 175px;"
          />
          <v-select
            v-model="sourceFilter"
            :items="sourceOptions"
            item-title="label"
            item-value="value"
            label="Fuente"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="max-width: 200px;"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-cash-clock"
            :disabled="!selectedCompanyId || loading"
            :loading="loading"
            @click="fetchQueue"
          >
            Consultar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Estado inicial -->
    <div v-if="!result && !loading" class="text-center py-12 text-medium-emphasis">
      <v-icon size="52" class="mb-3">mdi-cash-clock</v-icon>
      <div class="text-body-1">Selecciona una compañía y consulta la cola de pagos</div>
    </div>

    <template v-if="result">

      <!-- Tabs de estado -->
      <v-chip-group v-model="statusTab" mandatory class="mb-4">
        <v-chip filter value="all" variant="outlined">
          Todos ({{ statusCounts.all }})
        </v-chip>
        <v-chip filter value="pending" color="amber" variant="outlined">
          Pendientes ({{ statusCounts.pending }})
        </v-chip>
        <v-chip filter value="approved" color="green" variant="outlined">
          Aprobados ({{ statusCounts.approved }})
        </v-chip>
        <v-chip filter value="rejected" color="error" variant="outlined">
          Rechazados ({{ statusCounts.rejected }})
        </v-chip>
        <v-chip filter value="discarded" color="grey" variant="outlined">
          Descartados ({{ statusCounts.discarded }})
        </v-chip>
        <v-chip filter value="paid" color="blue-darken-1" variant="outlined">
          Pagados ({{ statusCounts.paid }})
        </v-chip>
      </v-chip-group>

      <!-- Chips de resumen -->
      <v-row class="mb-4" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-format-list-checks">
            {{ filteredItems.length }} registros
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="amber" prepend-icon="mdi-cash">
            Total: {{ fmtMXN(totalAmount) }} MXN
          </v-chip>
        </v-col>
      </v-row>

      <!-- Sin items -->
      <v-card v-if="!filteredItems.length" elevation="0" border>
        <v-card-text class="text-center py-10">
          <v-icon size="48" color="medium-emphasis" class="mb-2">mdi-cash-off</v-icon>
          <div class="text-body-1">No hay pagos en este estado</div>
        </v-card-text>
      </v-card>

      <!-- Tabla -->
      <v-card v-else elevation="0" border>
        <v-data-table
          v-model:selected="selectedIds"
          show-select
          :headers="headers"
          :items="filteredItems"
          item-value="id"
          density="compact"
          items-per-page="25"
          hover
        >
          <template #item.callsign="{ item }">
            <code class="text-body-2">{{ item.callsign }}</code>
          </template>

          <template #item.full_name="{ item }">
            <div>
              <div class="text-body-2">{{ item.full_name }}</div>
              <div v-if="item.notes" class="text-caption text-medium-emphasis">{{ item.notes }}</div>
            </div>
          </template>

          <template #item.bank_name="{ item }">
            <div>
              <div class="text-body-2">{{ item.bank_name }}</div>
              <code style="font-size: 10px;" class="text-medium-emphasis">{{ item.bank_sort_code }}</code>
            </div>
          </template>

          <template #item.amount="{ item }">
            <span
              class="text-body-2"
              :class="item.adjusted_amount ? 'text-decoration-line-through text-medium-emphasis' : 'font-weight-medium'"
            >
              {{ fmtMXN(item.amount) }}
            </span>
          </template>

          <template #item.adjusted_amount="{ item }">
            <span v-if="item.adjusted_amount" class="text-success font-weight-medium text-body-2">
              {{ fmtMXN(item.adjusted_amount) }}
            </span>
            <span v-else class="text-medium-emphasis text-body-2">—</span>
          </template>

          <template #item.source="{ item }">
            <v-chip :color="sourceMap[item.source]?.color" size="x-small" variant="tonal">
              {{ sourceMap[item.source]?.label ?? item.source }}
            </v-chip>
          </template>

          <template #item.status="{ item }">
            <div>
              <v-chip :color="statusMap[item.status]?.color" size="x-small" variant="tonal">
                {{ statusMap[item.status]?.label ?? item.status }}
              </v-chip>
              <div v-if="item.rejection_reason" class="text-caption text-error mt-1" style="max-width: 140px;">
                {{ item.rejection_reason }}
              </div>
            </div>
          </template>

          <template #item.queued_by="{ item }">
            <span class="text-body-2 text-medium-emphasis" style="font-size: 11px;">
              {{ item.queued_by }}
            </span>
          </template>

          <template #item.queued_at="{ item }">
            <span class="text-body-2 text-medium-emphasis">{{ fmtDateTime(item.queued_at) }}</span>
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex gap-1 justify-center">
              <!-- Pendiente: aprobar + rechazar -->
              <template v-if="item.status === 'pending'">
                <v-tooltip text="Aprobar" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-check"
                      size="x-small"
                      color="success"
                      variant="tonal"
                      v-bind="props"
                      :loading="actionLoadingId === item.id + '_approve'"
                      @click.stop="openApprove(item)"
                    />
                  </template>
                </v-tooltip>
                <v-tooltip text="Rechazar" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      color="error"
                      variant="tonal"
                      v-bind="props"
                      :loading="actionLoadingId === item.id + '_reject'"
                      @click.stop="openReject(item)"
                    />
                  </template>
                </v-tooltip>
              </template>

              <!-- Rechazado: reintentar + descartar -->
              <template v-if="item.status === 'rejected'">
                <v-tooltip text="Reintentar" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-refresh"
                      size="x-small"
                      color="warning"
                      variant="tonal"
                      v-bind="props"
                      :loading="actionLoadingId === item.id + '_approve'"
                      @click.stop="openApprove(item)"
                    />
                  </template>
                </v-tooltip>
                <v-tooltip text="Descartar" location="top">
                  <template #activator="{ props }">
                    <v-btn
                      icon="mdi-trash-can-outline"
                      size="x-small"
                      color="grey"
                      variant="tonal"
                      v-bind="props"
                      :loading="actionLoadingId === item.id + '_discard'"
                      @click.stop="openDiscard(item)"
                    />
                  </template>
                </v-tooltip>
              </template>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- ── Barra de acciones bulk (fixed bottom) ── -->
    <v-slide-y-reverse-transition>
      <div
        v-if="selectedIds.length"
        style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200;"
      >
        <v-card elevation="8" rounded="pill" class="px-5 py-0">
          <div class="d-flex align-center gap-3" style="height: 52px;">
            <span class="text-body-2 font-weight-medium">
              {{ selectedIds.length }} seleccionado{{ selectedIds.length !== 1 ? 's' : '' }}
              — {{ fmtMXN(selectedAmount) }} MXN
            </span>
            <v-divider vertical class="mx-1" />
            <v-btn
              size="small"
              color="success"
              variant="tonal"
              prepend-icon="mdi-check-all"
              :loading="bulkLoading"
              @click="bulkApprove"
            >
              Aprobar seleccionados
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              prepend-icon="mdi-check-circle-outline"
              @click="selectAllPending"
            >
              Seleccionar todos los pendientes
            </v-btn>
            <v-btn
              icon="mdi-close"
              size="small"
              variant="text"
              @click="selectedIds = []"
            />
          </div>
        </v-card>
      </div>
    </v-slide-y-reverse-transition>

    <!-- ── Dialog Aprobar ── -->
    <v-dialog v-model="approveDialog.show" width="420" persistent>
      <v-card v-if="approveDialog.item">
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="success" size="20">mdi-check-circle</v-icon>
          Aprobar pago
        </v-card-title>

        <v-card-text class="px-5 pb-2">
          <v-row dense class="mb-3">
            <v-col cols="auto">
              <v-chip size="small" variant="tonal" color="teal">
                <code>{{ approveDialog.item.callsign }}</code>
              </v-chip>
            </v-col>
            <v-col class="text-body-2 d-flex align-center">
              {{ approveDialog.item.full_name }}
            </v-col>
          </v-row>

          <div class="text-body-2 mb-1">
            Banco: <strong>{{ approveDialog.item.bank_name }}</strong>
          </div>
          <div class="text-body-2 mb-4">
            Monto original: <strong>{{ fmtMXN(approveDialog.item.amount) }} MXN</strong>
          </div>

          <v-text-field
            v-model="approveDialog.adjustedAmount"
            type="number"
            label="Monto ajustado (opcional)"
            variant="outlined"
            density="compact"
            hint="Deja vacío para usar el monto original"
            persistent-hint
            :min="0"
            prefix="$"
            suffix="MXN"
          />
        </v-card-text>

        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="approveDialog.loading" @click="approveDialog.show = false">
            Cancelar
          </v-btn>
          <v-btn
            color="success"
            variant="tonal"
            :loading="approveDialog.loading"
            @click="confirmApprove"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog Rechazar ── -->
    <v-dialog v-model="rejectDialog.show" width="420" persistent>
      <v-card v-if="rejectDialog.item">
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="error" size="20">mdi-close-circle</v-icon>
          Rechazar pago
        </v-card-title>

        <v-card-text class="px-5 pb-2">
          <v-row dense class="mb-3">
            <v-col cols="auto">
              <v-chip size="small" variant="tonal" color="teal">
                <code>{{ rejectDialog.item.callsign }}</code>
              </v-chip>
            </v-col>
            <v-col class="text-body-2 d-flex align-center">
              {{ rejectDialog.item.full_name }}
            </v-col>
          </v-row>

          <div class="text-body-2 mb-4">
            Monto: <strong>{{ fmtMXN(rejectDialog.item.effective_amount) }} MXN</strong>
          </div>

          <v-textarea
            v-model="rejectDialog.reason"
            label="Motivo del rechazo (opcional)"
            variant="outlined"
            density="compact"
            rows="3"
            auto-grow
            counter="200"
            maxlength="200"
          />
        </v-card-text>

        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="rejectDialog.loading" @click="rejectDialog.show = false">
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            :loading="rejectDialog.loading"
            @click="confirmReject"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog Descartar ── -->
    <v-dialog v-model="discardDialog.show" width="380" persistent>
      <v-card v-if="discardDialog.item">
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="grey" size="20">mdi-trash-can-outline</v-icon>
          Descartar pago
        </v-card-title>

        <v-card-text class="px-5 pb-2">
          <div class="text-body-2">
            ¿Descartar el pago de
            <strong>{{ fmtMXN(discardDialog.item.effective_amount) }} MXN</strong>
            a
            <strong>{{ discardDialog.item.full_name }}</strong>?
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            Esta acción no se puede deshacer.
          </div>
        </v-card-text>

        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="text" :disabled="discardDialog.loading" @click="discardDialog.show = false">
            Cancelar
          </v-btn>
          <v-btn
            color="grey"
            variant="tonal"
            :loading="discardDialog.loading"
            @click="confirmDiscard"
          >
            Descartar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Dialog errores bulk ── -->
    <v-dialog v-model="bulkErrorsDialog.show" width="500" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="warning" size="20">mdi-alert-circle-outline</v-icon>
          Pagos fallidos
        </v-card-title>
        <v-card-text class="px-5">
          <div class="text-body-2 mb-3 text-medium-emphasis">
            Los siguientes pagos no pudieron ejecutarse:
          </div>
          <v-list density="compact">
            <v-list-item
              v-for="f in bulkErrorsDialog.failed"
              :key="f.id"
              :subtitle="f.error"
            >
              <template #title>
                <span class="text-body-2">
                  <code>{{ f.callsign }}</code> — {{ f.full_name }}
                </span>
              </template>
              <template #prepend>
                <v-icon color="error" size="16" class="mr-2">mdi-close-circle-outline</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="px-5 pb-4">
          <v-spacer />
          <v-btn variant="tonal" @click="bulkErrorsDialog.show = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom right" timeout="4000">
      {{ snack.text }}
    </v-snackbar>
  </MainLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'

const companies      = ref([])
const loadingCompanies = ref(false)
const selectedCompanyId = ref(null)
const loading        = ref(false)
const bulkLoading    = ref(false)
const result         = ref(null)
const selectedIds    = ref([])
const statusTab      = ref('all')
const sourceFilter   = ref(null)
const actionLoadingId = ref(null)
const snack          = ref({ show: false, text: '', color: 'success' })

const approveDialog    = ref({ show: false, item: null, adjustedAmount: '', loading: false })
const rejectDialog     = ref({ show: false, item: null, reason: '', loading: false })
const discardDialog    = ref({ show: false, item: null, loading: false })
const bulkErrorsDialog = ref({ show: false, failed: [] })

const getMondayOfWeek = () => {
  const today = new Date()
  const diff = today.getDay() === 0 ? -6 : 1 - today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}
const dateFrom = ref(getMondayOfWeek())
const dateTo   = ref(new Date().toISOString().slice(0, 10))

const headers = [
  { title: 'Callsign',     key: 'callsign',        width: '90px' },
  { title: 'Nombre',       key: 'full_name' },
  { title: 'Banco',        key: 'bank_name' },
  { title: 'Monto',        key: 'amount',           align: 'end', width: '110px' },
  { title: 'Ajustado',     key: 'adjusted_amount',  align: 'end', width: '110px' },
  { title: 'Fuente',       key: 'source',           align: 'center', width: '150px' },
  { title: 'Estado',       key: 'status',           align: 'center', width: '130px' },
  { title: 'Encolado por', key: 'queued_by',        width: '160px' },
  { title: 'Fecha',        key: 'queued_at',        width: '140px' },
  { title: 'Acciones',     key: 'actions',          sortable: false, align: 'center', width: '90px' },
]

const sourceMap = {
  driver_balance:    { label: 'Saldo conductor',    color: 'blue' },
  referral_bonus:    { label: 'Bono referido',      color: 'teal' },
  daily_bonus:       { label: 'Bono diario',        color: 'green' },
  first_trips_bonus: { label: 'Primeros viajes',    color: 'cyan' },
  spei_transfer:     { label: 'Transferencia SPEI', color: 'orange' },
  individual:        { label: 'Individual',         color: 'grey' },
}

const statusMap = {
  pending:   { label: 'Pendiente',  color: 'amber' },
  approved:  { label: 'Aprobado',   color: 'green' },
  rejected:  { label: 'Rechazado',  color: 'error' },
  discarded: { label: 'Descartado', color: 'grey' },
  paid:      { label: 'Pagado',     color: 'blue-darken-1' },
}

const sourceOptions = Object.entries(sourceMap).map(([value, { label }]) => ({ value, label }))

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const sourceFilteredItems = computed(() => {
  const items = result.value?.items ?? []
  if (!sourceFilter.value) return items
  return items.filter(i => i.source === sourceFilter.value)
})

const filteredItems = computed(() => {
  const items = sourceFilteredItems.value
  if (statusTab.value === 'all') return items
  return items.filter(i => i.status === statusTab.value)
})

const statusCounts = computed(() => {
  const items = sourceFilteredItems.value
  return {
    all:       items.length,
    pending:   items.filter(i => i.status === 'pending').length,
    approved:  items.filter(i => i.status === 'approved').length,
    rejected:  items.filter(i => i.status === 'rejected').length,
    discarded: items.filter(i => i.status === 'discarded').length,
    paid:      items.filter(i => i.status === 'paid').length,
  }
})

const totalAmount = computed(() =>
  filteredItems.value.reduce((s, i) => s + (i.effective_amount ?? 0), 0)
)

const selectedAmount = computed(() => {
  const idSet = new Set(selectedIds.value)
  return (result.value?.items ?? [])
    .filter(i => idSet.has(i.id))
    .reduce((s, i) => s + (i.effective_amount ?? 0), 0)
})

watch([statusTab, sourceFilter], () => { selectedIds.value = [] })

const fmtMXN = (n) => {
  if (n == null) return '—'
  return `$${Number(n).toLocaleString('es-MX')}`
}

const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const clearResults = () => {
  result.value = null
  selectedIds.value = []
  statusTab.value = 'all'
}

const showSnack = (text, color = 'success') => {
  snack.value = { show: true, text, color }
}

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } catch {
    showSnack('Error al cargar compañías', 'error')
  } finally {
    loadingCompanies.value = false
  }
}

const fetchQueue = async () => {
  loading.value = true
  selectedIds.value = []
  try {
    const params = { company_id: selectedCompanyId.value }
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value)   params.date_to   = dateTo.value
    const { data } = await apiClient.get('/payment-queue/', { params })
    result.value = data
  } catch (err) {
    const status = err.response?.status
    if (status === 403) showSnack('Sin permiso para ver la cola de pagos.', 'error')
    else {
      const detail = err.response?.data?.detail
      showSnack(typeof detail === 'string' ? detail : 'Error al cargar la cola de pagos', 'error')
    }
  } finally {
    loading.value = false
  }
}

// ── Aprobar ──
const openApprove = (item) => {
  approveDialog.value = {
    show: true,
    item,
    adjustedAmount: item.adjusted_amount ? String(item.adjusted_amount) : '',
    loading: false,
  }
}

const confirmApprove = async () => {
  const { item, adjustedAmount } = approveDialog.value
  approveDialog.value.loading = true
  actionLoadingId.value = `${item.id}_approve`
  try {
    const body = {}
    const val = parseFloat(adjustedAmount)
    if (!isNaN(val) && val > 0) body.adjusted_amount = val
    const { data } = await apiClient.patch(`/payment-queue/${item.id}/approve`, body)
    showSnack(`Pago ejecutado — tracking: ${data.tracking_code}`)
    approveDialog.value.show = false
    await fetchQueue()
  } catch (err) {
    const status = err.response?.status
    if (status === 502) {
      showSnack('Peibo no disponible. Intenta más tarde.', 'error')
    } else {
      const detail = err.response?.data?.detail
      showSnack(typeof detail === 'string' ? detail : 'Error al aprobar el pago', 'error')
    }
  } finally {
    approveDialog.value.loading = false
    actionLoadingId.value = null
  }
}

// ── Rechazar ──
const openReject = (item) => {
  rejectDialog.value = {
    show: true,
    item,
    reason: item.rejection_reason ?? '',
    loading: false,
  }
}

const confirmReject = async () => {
  const { item, reason } = rejectDialog.value
  rejectDialog.value.loading = true
  actionLoadingId.value = `${item.id}_reject`
  try {
    const body = reason.trim() ? { rejection_reason: reason.trim() } : {}
    await apiClient.patch(`/payment-queue/${item.id}/reject`, body)
    showSnack('Pago rechazado', 'warning')
    rejectDialog.value.show = false
    await fetchQueue()
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al rechazar el pago', 'error')
  } finally {
    rejectDialog.value.loading = false
    actionLoadingId.value = null
  }
}

// ── Descartar ──
const openDiscard = (item) => {
  discardDialog.value = { show: true, item, loading: false }
}

const confirmDiscard = async () => {
  const { item } = discardDialog.value
  discardDialog.value.loading = true
  actionLoadingId.value = `${item.id}_discard`
  try {
    await apiClient.patch(`/payment-queue/${item.id}/discard`)
    showSnack('Pago descartado', 'info')
    discardDialog.value.show = false
    await fetchQueue()
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al descartar el pago', 'error')
  } finally {
    discardDialog.value.loading = false
    actionLoadingId.value = null
  }
}

// ── Bulk approve ──
const bulkApprove = async () => {
  const idSet = new Set(selectedIds.value)
  const ids = (result.value?.items ?? [])
    .filter(i => idSet.has(i.id) && i.status === 'pending')
    .map(i => i.id)

  if (!ids.length) {
    showSnack('No hay pagos pendientes en la selección', 'warning')
    return
  }
  bulkLoading.value = true
  try {
    const { data } = await apiClient.post('/payment-queue/bulk-approve', { ids }, {
      params: { company_id: selectedCompanyId.value },
    })
    selectedIds.value = []
    await fetchQueue()
    const { paid = 0, errors = 0, failed = [] } = data
    if (errors === 0) {
      showSnack(`${paid} pago${paid !== 1 ? 's' : ''} ejecutado${paid !== 1 ? 's' : ''} correctamente`)
    } else {
      showSnack(`${paid} ejecutado${paid !== 1 ? 's' : ''}, ${errors} fallaron`, 'warning')
      if (failed.length) {
        bulkErrorsDialog.value = { show: true, failed }
      }
    }
  } catch (err) {
    const detail = err.response?.data?.detail
    showSnack(typeof detail === 'string' ? detail : 'Error al aprobar en lote', 'error')
  } finally {
    bulkLoading.value = false
  }
}

const selectAllPending = () => {
  selectedIds.value = filteredItems.value
    .filter(i => i.status === 'pending')
    .map(i => i.id)
}

onMounted(loadCompanies)
</script>
