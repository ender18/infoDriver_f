<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Referidos</div>
    <v-divider class="mb-6" color="primary" :thickness="2" style="max-width: 60px;" />

    <!-- Panel de consulta -->
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
            @update:model-value="clearResults"
          />
          <v-btn
            color="primary"
            prepend-icon="mdi-account-arrow-right"
            :disabled="!selectedCompanyId || running"
            :loading="running"
            @click="fetchReferrals"
          >
            Consultar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Estado inicial -->
    <div v-if="!result && !running" class="text-center py-12 text-medium-emphasis">
      <v-icon size="52" class="mb-3">mdi-account-arrow-right</v-icon>
      <div class="text-body-1">Selecciona una compañía y consulta los referidos</div>
    </div>

    <!-- Resultados -->
    <template v-if="result">

      <!-- Chips de resumen + botón semanal -->
      <v-row class="mb-4" align="center" dense>
        <v-col cols="auto">
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-account-multiple">
            {{ result.total_drivers }} conductores
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="teal" prepend-icon="mdi-account-arrow-right">
            {{ result.total_referrers }} referidores
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="secondary" prepend-icon="mdi-account-plus">
            {{ result.total_referred }} referidos
          </v-chip>
        </v-col>
        <v-col cols="auto">
          <v-chip variant="tonal" color="amber" prepend-icon="mdi-star-circle">
            Bono acumulado: {{ fmtMXN(totalHeroBonus) }} MXN
          </v-chip>
        </v-col>
        <v-spacer />
        <v-col cols="12" sm="auto" class="d-flex gap-3 align-center flex-wrap">
          <v-badge
            :content="fmtMXN(result.weekly_payments?.total_to_pay)"
            :model-value="(result.weekly_payments?.total_to_pay ?? 0) > 0"
            color="green"
          >
            <v-btn
              variant="tonal"
              color="green"
              prepend-icon="mdi-cash-multiple"
              @click="weeklyModal = true"
            >
              Pagos de la semana
            </v-btn>
          </v-badge>
          <v-text-field
            v-if="result.referrers.length"
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Buscar..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="min-width: 220px;"
          />
          <v-btn v-if="result.referrers.length" variant="tonal" prepend-icon="mdi-download" @click="exportCsv">
            Exportar CSV
          </v-btn>
        </v-col>
      </v-row>

      <!-- Plan HERO colapsable -->
      <v-card elevation="0" border class="mb-4">
        <v-card-text class="pb-2">
          <div
            class="d-flex align-center gap-2 cursor-pointer"
            style="user-select: none;"
            @click="heroPlanOpen = !heroPlanOpen"
          >
            <v-icon size="18" color="deep-purple">mdi-star-four-points</v-icon>
            <span class="text-body-2 font-weight-medium">Plan HERO — niveles de bono</span>
            <v-icon size="16" class="ml-auto">{{ heroPlanOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </div>
        </v-card-text>

        <v-expand-transition>
          <div v-if="heroPlanOpen">
            <v-divider />
            <v-card-text class="pt-3">
              <v-table density="compact" style="max-width: 480px;">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Viajes acumulados</th>
                    <th>Bono parcial</th>
                    <th>Bono acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(step, i) in result.hero_plan" :key="i">
                    <td>
                      <v-chip size="x-small" variant="tonal" :color="heroPlanChipColor(i)">
                        {{ step.viajes == null ? 'Recurrente' : `Nivel ${i + 1}` }}
                      </v-chip>
                    </td>
                    <td class="text-body-2">{{ step.viajes == null ? '>100' : step.viajes }}</td>
                    <td class="text-body-2">{{ fmtMXN(step.parcial) }}</td>
                    <td class="text-body-2 font-weight-medium">{{ fmtMXN(heroPlanCumulative[i]) }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </div>
        </v-expand-transition>
      </v-card>

      <!-- Sin referidores -->
      <v-card v-if="!result.referrers.length" elevation="0" border class="mb-4">
        <v-card-text class="text-center py-10">
          <v-icon size="48" color="medium-emphasis" class="mb-2">mdi-account-arrow-right</v-icon>
          <div class="text-body-1">No se encontraron referidores para esta compañía</div>
        </v-card-text>
      </v-card>

      <!-- Tabla de referidores -->
      <v-card v-else elevation="0" border>
        <v-data-table
          :headers="headers"
          :items="filteredReferrers"
          item-value="ref_value"
          density="compact"
          items-per-page="25"
          hover
          :row-props="() => ({ style: 'cursor: pointer' })"
          @click:row="(_, { item }) => openModal(item)"
        >
          <template #item.callsign="{ item }">
            <code v-if="item.callsign" class="text-body-2">{{ item.callsign }}</code>
            <span v-else class="text-medium-emphasis text-body-2">—</span>
          </template>

          <template #item.full_name="{ item }">
            <span v-if="item.full_name" class="text-body-2">{{ item.full_name }}</span>
            <v-chip v-else variant="tonal" color="secondary" size="x-small">
              {{ item.ref_value }}
            </v-chip>
          </template>

          <template #item.referred_count="{ item }">
            <v-chip color="teal" size="x-small" variant="tonal">
              {{ item.referred_count }}
            </v-chip>
          </template>

          <template #item.total_hero_bonus="{ item }">
            <v-chip color="amber" size="x-small" variant="tonal">
              {{ fmtMXN(item.total_hero_bonus) }} MXN
            </v-chip>
          </template>

          <template #item.this_week_bonus="{ item }">
            <v-chip v-if="item.this_week_bonus > 0" color="green" size="x-small" variant="tonal">
              {{ fmtMXN(item.this_week_bonus) }} MXN
            </v-chip>
            <span v-else class="text-medium-emphasis text-body-2">—</span>
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

    <!-- ── Modal de referidos ── -->
    <v-dialog v-model="modal.show" width="80vw" max-width="1200" min-width="340" scrollable>
      <v-card v-if="modal.referrer">
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="teal" size="22">mdi-account-arrow-right</v-icon>
          <span class="text-body-1 font-weight-bold">
            {{ modal.referrer.full_name ?? modal.referrer.ref_value }}
          </span>
          <v-chip
            v-if="modal.referrer.callsign"
            size="x-small"
            variant="tonal"
            color="teal"
            class="ml-1"
          >
            {{ modal.referrer.callsign }}
          </v-chip>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="modal.show = false" />
        </v-card-title>

        <v-card-subtitle class="px-5 pb-0 d-flex align-center gap-3 flex-wrap">
          <span class="text-medium-emphasis">
            {{ modal.referrer.referred_count }} conductor{{ modal.referrer.referred_count !== 1 ? 'es' : '' }} referido{{ modal.referrer.referred_count !== 1 ? 's' : '' }}
          </span>
          <v-chip size="x-small" variant="tonal" color="amber">
            Bono acumulado: {{ fmtMXN(modal.referrer.total_hero_bonus) }} MXN
          </v-chip>
          <v-chip v-if="modal.referrer.this_week_bonus > 0" size="x-small" variant="tonal" color="green">
            Esta semana: {{ fmtMXN(modal.referrer.this_week_bonus) }} MXN
          </v-chip>
        </v-card-subtitle>

        <v-card-text class="px-5 py-3">
          <v-text-field
            v-model="modalSearch"
            prepend-inner-icon="mdi-magnify"
            placeholder="Buscar por callsign o nombre..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-card-text>

        <v-divider />

        <v-card-text class="pa-0" style="max-height: 65vh; overflow-y: auto;">
          <v-data-table
            :headers="referredHeaders"
            :items="filteredModalItems"
            item-value="driver_id"
            density="comfortable"
            hide-default-footer
            :items-per-page="-1"
          >
            <template #item.callsign="{ item }">
              <code class="text-body-2">{{ item.callsign }}</code>
            </template>

            <template #item.hero_level="{ item }">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="heroChip(item.hero_level, item.hero_ongoing).color"
              >
                {{ heroChip(item.hero_level, item.hero_ongoing).label }}
              </v-chip>
            </template>

            <template #item.hero_earned="{ item }">
              <span class="text-body-2 font-weight-medium">{{ fmtMXN(item.hero_earned) }}</span>
            </template>

            <template #item.last_booking_at="{ item }">
              <span class="text-body-2 text-medium-emphasis">{{ fmtDate(item.last_booking_at) }}</span>
            </template>

            <template #item.this_week_bonus="{ item }">
              <v-chip v-if="item.this_week_bonus > 0" color="green" size="x-small" variant="tonal">
                {{ fmtMXN(item.this_week_bonus) }}
              </v-chip>
              <span v-else class="text-medium-emphasis text-body-2">—</span>
            </template>

            <template #item.milestones="{ item }">
              <v-tooltip v-if="item.hero_milestones?.length" location="start">
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-history"
                    size="x-small"
                    variant="text"
                    color="primary"
                    v-bind="props"
                  />
                </template>
                <div class="pa-1">
                  <div class="text-caption font-weight-bold mb-2">Historial de hitos</div>
                  <table style="border-collapse: collapse; min-width: 240px;">
                    <tr v-for="m in item.hero_milestones" :key="m.level">
                      <td class="text-caption pr-3 py-1">
                        <v-chip size="x-small" variant="tonal" :color="heroChip(m.level, false).color">
                          Nv.{{ m.level }}
                        </v-chip>
                      </td>
                      <td class="text-caption pr-3">Viaje #{{ m.viajes }}</td>
                      <td class="text-caption pr-3">{{ fmtMXN(m.parcial) }}</td>
                      <td class="text-caption text-medium-emphasis">{{ fmtDateShort(m.reached_at) }}</td>
                    </tr>
                  </table>
                </div>
              </v-tooltip>
            </template>

            <template #no-data>
              <div class="text-center py-8 text-medium-emphasis text-body-2">
                Sin referidos registrados
              </div>
            </template>
          </v-data-table>
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-5 py-3">
          <v-spacer />
          <v-btn variant="text" @click="modal.show = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Modal Pagos de la semana ── -->
    <v-dialog v-model="weeklyModal" width="70vw" max-width="960" min-width="340" scrollable>
      <v-card v-if="result?.weekly_payments">
        <v-card-title class="d-flex align-center gap-2 pt-5 px-5">
          <v-icon color="green" size="22">mdi-cash-multiple</v-icon>
          <span class="text-body-1 font-weight-bold">
            Bonos a pagar —
            semana del {{ fmtDateShort(result.weekly_payments.week_start) }}
            al {{ fmtDateShort(result.weekly_payments.week_end) }}
          </span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="weeklyModal = false" />
        </v-card-title>

        <!-- Total en grande -->
        <v-card-text class="pb-0 pt-4 text-center">
          <div class="text-h3 font-weight-bold text-green">
            {{ fmtMXN(result.weekly_payments.total_to_pay) }}
            <span class="text-h5 font-weight-regular text-medium-emphasis">MXN</span>
          </div>
          <div class="text-caption text-medium-emphasis mt-1">Total a pagar esta semana</div>
        </v-card-text>

        <v-card-text style="max-height: 65vh; overflow-y: auto;">
          <!-- Sin pagos esta semana -->
          <div
            v-if="!result.weekly_payments.referrers.length"
            class="text-center py-10 text-medium-emphasis"
          >
            <v-icon size="40" class="mb-2">mdi-cash-off</v-icon>
            <div class="text-body-2">Ningún referidor tiene bonos esta semana</div>
          </div>

          <!-- Lista de referidores -->
          <v-expansion-panels v-else variant="accordion" class="mt-2">
            <v-expansion-panel
              v-for="ref in result.weekly_payments.referrers"
              :key="ref.ref_value"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center gap-3 w-100">
                  <span class="text-body-2 font-weight-medium">
                    <code v-if="ref.callsign">{{ ref.callsign }}</code>{{ ref.callsign ? ' ' : '' }}{{ ref.full_name ?? ref.ref_value }}
                  </span>
                  <v-spacer />
                  <v-chip color="green" size="x-small" variant="tonal" class="mr-2">
                    {{ fmtMXN(ref.this_week_bonus) }} MXN
                  </v-chip>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text class="pa-0">
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>Callsign</th>
                      <th>Nombre</th>
                      <th>Milestone alcanzado</th>
                      <th>Fecha</th>
                      <th class="text-right">Bono</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="driver in ref.drivers" :key="driver.driver_id">
                      <tr v-for="(m, mi) in driver.milestones" :key="`${driver.driver_id}-${mi}`">
                        <td>
                          <code v-if="mi === 0" class="text-body-2">{{ driver.callsign }}</code>
                        </td>
                        <td>
                          <span v-if="mi === 0" class="text-body-2">{{ driver.full_name }}</span>
                        </td>
                        <td class="text-body-2">Viaje #{{ m.viajes }} — Nivel {{ m.level }}</td>
                        <td class="text-body-2 text-medium-emphasis">{{ fmtDateShort(m.reached_at) }}</td>
                        <td class="text-body-2 text-right font-weight-medium">{{ fmtMXN(m.parcial) }}</td>
                      </tr>
                    </template>
                  </tbody>
                </v-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-5 py-3">
          <v-btn variant="tonal" prepend-icon="mdi-download" @click="exportWeeklyCsv">
            Exportar CSV
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="weeklyModal = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
const modal = ref({ show: false, referrer: null })
const modalSearch = ref('')
const weeklyModal = ref(false)
const heroPlanOpen = ref(false)
const snack = ref({ show: false, text: '', color: 'error' })

const headers = [
  { title: 'Callsign',        key: 'callsign' },
  { title: 'Nombre / Código', key: 'full_name' },
  { title: 'Referidos',       key: 'referred_count',  align: 'center' },
  { title: 'Bono acumulado',  key: 'total_hero_bonus', align: 'center' },
  { title: 'Esta semana',     key: 'this_week_bonus',  align: 'center' },
]

const referredHeaders = [
  { title: 'Callsign',       key: 'callsign' },
  { title: 'Nombre',         key: 'full_name' },
  { title: 'Viajes totales', key: 'completed_trips', align: 'center' },
  { title: 'Últimos 15d',    key: 'completed_15d',   align: 'center' },
  { title: 'Nivel HERO',     key: 'hero_level',       align: 'center' },
  { title: 'Bono generado',  key: 'hero_earned',      align: 'center' },
  { title: 'Último viaje',   key: 'last_booking_at' },
  { title: 'Esta semana',    key: 'this_week_bonus',  align: 'center' },
  { title: '',               key: 'milestones',       sortable: false, align: 'center', width: '48px' },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const totalHeroBonus = computed(() =>
  result.value?.referrers?.reduce((s, r) => s + (r.total_hero_bonus ?? 0), 0) ?? 0
)

const heroPlanCumulative = computed(() => {
  const plan = result.value?.hero_plan ?? []
  let acc = 0
  return plan.map(step => {
    acc += step.parcial ?? 0
    return acc
  })
})

const filteredReferrers = computed(() => {
  const list = result.value?.referrers ?? []
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(r =>
    r.callsign?.toLowerCase().includes(q) ||
    r.full_name?.toLowerCase().includes(q) ||
    r.ref_value?.toLowerCase().includes(q)
  )
})

const filteredModalItems = computed(() => {
  const list = modal.value.referrer?.referred ?? []
  if (!modalSearch.value) return list
  const q = modalSearch.value.toLowerCase()
  return list.filter(r =>
    r.callsign?.toLowerCase().includes(q) ||
    r.full_name?.toLowerCase().includes(q)
  )
})

const heroChip = (level, ongoing) => {
  if (ongoing) return { color: 'deep-purple', label: '⭐ HERO · $2,500+' }
  const map = [
    { color: 'grey',        label: 'Sin viajes'         },
    { color: 'blue-grey',   label: 'Nv.1 · $500'        },
    { color: 'teal',        label: 'Nv.2 · $700'        },
    { color: 'green',       label: 'Nv.3 · $1,000'      },
    { color: 'orange',      label: 'Nv.4 · $1,500'      },
    { color: 'deep-purple', label: 'Nv.5 · $2,500'      },
  ]
  return map[level] ?? map[0]
}

const heroPlanChipColor = (index) => {
  const colors = ['blue-grey', 'teal', 'green', 'orange', 'deep-purple', 'deep-purple']
  return colors[index] ?? 'grey'
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
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const clearResults = () => {
  result.value = null
  search.value = ''
  heroPlanOpen.value = false
}

const openModal = (referrer) => {
  modalSearch.value = ''
  modal.value = { show: true, referrer }
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

const fetchReferrals = async () => {
  running.value = true
  result.value = null
  search.value = ''
  heroPlanOpen.value = false
  try {
    const { data } = await apiClient.get('/tools/drivers/referrals', {
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
      showSnack(typeof detail === 'string' ? detail : 'Error al consultar referidos')
    }
  } finally {
    running.value = false
  }
}

const exportCsv = () => {
  const rows = []
  for (const ref of result.value.referrers) {
    for (const r of ref.referred) {
      rows.push({
        referrer_ref_value:   ref.ref_value,
        referrer_callsign:    ref.callsign ?? '',
        referrer_name:        ref.full_name ?? '',
        referrer_hero_bonus:  ref.total_hero_bonus ?? 0,
        referrer_week_bonus:  ref.this_week_bonus ?? 0,
        driver_id:            r.driver_id,
        callsign:             r.callsign,
        full_name:            r.full_name,
        email:                r.email ?? '',
        completed_trips:      r.completed_trips,
        completed_15d:        r.completed_15d,
        hero_level:           r.hero_level,
        hero_earned:          r.hero_earned,
        hero_ongoing:         r.hero_ongoing ? 'sí' : 'no',
        this_week_bonus:      r.this_week_bonus ?? 0,
        last_booking_at:      r.last_booking_at ?? '',
      })
    }
  }
  if (!rows.length) return
  const cols = [
    'referrer_ref_value', 'referrer_callsign', 'referrer_name', 'referrer_hero_bonus', 'referrer_week_bonus',
    'driver_id', 'callsign', 'full_name', 'email',
    'completed_trips', 'completed_15d', 'hero_level', 'hero_earned', 'hero_ongoing', 'this_week_bonus', 'last_booking_at',
  ]
  const csv = [
    cols.join(','),
    ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `referidos_${result.value?.company?.name ?? 'compania'}_${Date.now()}.csv`
  a.click()
}

const exportWeeklyCsv = () => {
  const wp = result.value?.weekly_payments
  if (!wp?.referrers?.length) return
  const rows = []
  for (const ref of wp.referrers) {
    for (const driver of ref.drivers) {
      for (const m of driver.milestones) {
        rows.push({
          referrer_ref_value:  ref.ref_value,
          referrer_callsign:   ref.callsign ?? '',
          referrer_nombre:     ref.full_name ?? '',
          referrer_bono_semana: ref.this_week_bonus ?? 0,
          driver_id:           driver.driver_id,
          callsign:            driver.callsign,
          nombre:              driver.full_name,
          milestone_nivel:     m.level,
          milestone_viajes:    m.viajes,
          bono_parcial:        m.parcial,
          fecha_alcanzado:     m.reached_at ?? '',
          bono_conductor:      driver.bonus ?? '',
        })
      }
    }
  }
  if (!rows.length) return
  const cols = [
    'referrer_ref_value', 'referrer_callsign', 'referrer_nombre', 'referrer_bono_semana',
    'driver_id', 'callsign', 'nombre',
    'milestone_nivel', 'milestone_viajes', 'bono_parcial', 'fecha_alcanzado', 'bono_conductor',
  ]
  const csv = [
    cols.join(','),
    ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const company = result.value?.company?.name ?? 'compania'
  const week = wp.week_start ?? Date.now()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = `pagos_semana_${company}_${week}.csv`
  a.click()
}

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
