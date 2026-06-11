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

      <!-- Chips de resumen -->
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
            Bono total: {{ fmtMXN(totalHeroBonus) }} MXN
          </v-chip>
        </v-col>
        <v-spacer />
        <v-col v-if="result.referrers.length" cols="12" sm="auto" class="d-flex gap-3 align-center">
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Buscar..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="min-width: 220px;"
          />
          <v-btn variant="tonal" prepend-icon="mdi-download" @click="exportCsv">
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
                      <v-chip
                        size="x-small"
                        variant="tonal"
                        :color="heroPlanChipColor(i)"
                      >
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

          <template #no-data>
            <div class="text-center py-8 text-medium-emphasis">
              <v-icon size="36" class="mb-2">mdi-filter-off</v-icon>
              <div class="text-body-2">Sin resultados para este filtro</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>

    <!-- Modal de referidos -->
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
            Bono estimado: {{ fmtMXN(modal.referrer.total_hero_bonus) }} MXN
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
const heroPlanOpen = ref(false)
const snack = ref({ show: false, text: '', color: 'error' })

const headers = [
  { title: 'Callsign',        key: 'callsign' },
  { title: 'Nombre / Código', key: 'full_name' },
  { title: 'Referidos',       key: 'referred_count',   align: 'center' },
  { title: 'Bono estimado',   key: 'total_hero_bonus',  align: 'center' },
]

const referredHeaders = [
  { title: 'Callsign',       key: 'callsign' },
  { title: 'Nombre',         key: 'full_name' },
  { title: 'Viajes totales', key: 'completed_trips', align: 'center' },
  { title: 'Últimos 15d',    key: 'completed_15d',   align: 'center' },
  { title: 'Nivel HERO',     key: 'hero_level',       align: 'center' },
  { title: 'Bono generado',  key: 'hero_earned',      align: 'center' },
  { title: 'Último viaje',   key: 'last_booking_at' },
]

const filteredModalItems = computed(() => {
  const list = modal.value.referrer?.referred ?? []
  if (!modalSearch.value) return list
  const q = modalSearch.value.toLowerCase()
  return list.filter(r =>
    r.callsign?.toLowerCase().includes(q) ||
    r.full_name?.toLowerCase().includes(q)
  )
})

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

const heroChip = (level, ongoing) => {
  if (ongoing) return { color: 'deep-purple', label: '⭐ HERO' }
  const map = [
    { color: 'grey',        label: 'Sin viajes'        },
    { color: 'blue-grey',   label: 'Nivel 1 · $500'    },
    { color: 'teal',        label: 'Nivel 2 · $700'    },
    { color: 'green',       label: 'Nivel 3 · $1,000'  },
    { color: 'orange',      label: 'Nivel 4 · $1,500'  },
    { color: 'deep-purple', label: 'Nivel 5 · $2,500'  },
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
        referrer_ref_value:  ref.ref_value,
        referrer_callsign:   ref.callsign ?? '',
        referrer_name:       ref.full_name ?? '',
        referrer_hero_bonus: ref.total_hero_bonus ?? 0,
        driver_id:           r.driver_id,
        callsign:            r.callsign,
        full_name:           r.full_name,
        email:               r.email ?? '',
        completed_trips:     r.completed_trips,
        completed_15d:       r.completed_15d,
        hero_level:          r.hero_level,
        hero_earned:         r.hero_earned,
        hero_ongoing:        r.hero_ongoing ? 'sí' : 'no',
        last_booking_at:     r.last_booking_at ?? '',
      })
    }
  }
  if (!rows.length) return
  const cols = [
    'referrer_ref_value', 'referrer_callsign', 'referrer_name', 'referrer_hero_bonus',
    'driver_id', 'callsign', 'full_name', 'email',
    'completed_trips', 'completed_15d', 'hero_level', 'hero_earned', 'hero_ongoing', 'last_booking_at',
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

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
