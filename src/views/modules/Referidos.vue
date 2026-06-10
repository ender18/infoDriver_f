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
      </v-row>

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
          :items="result.referrers"
          item-value="referrer_id"
          density="compact"
          items-per-page="25"
          hover
          expand-on-click
          show-expand
        >
          <template #item.callsign="{ item }">
            <code class="text-body-2">{{ item.callsign }}</code>
          </template>

          <template #item.referred_count="{ item }">
            <v-chip color="teal" size="x-small" variant="tonal">
              {{ item.referred_count }}
            </v-chip>
          </template>

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="pa-0">
                <div class="pa-4 bg-surface-variant">
                  <div class="text-caption text-medium-emphasis font-weight-medium mb-2">
                    Conductores referidos por {{ item.full_name }}
                  </div>
                  <v-table density="compact" class="rounded">
                    <thead>
                      <tr>
                        <th class="text-left">Callsign</th>
                        <th class="text-left">Nombre</th>
                        <th class="text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="r in item.referred" :key="r.driver_id">
                        <td><code class="text-body-2">{{ r.callsign }}</code></td>
                        <td class="text-body-2">{{ r.full_name }}</td>
                        <td class="text-body-2 text-medium-emphasis">{{ r.email || '—' }}</td>
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
const running = ref(false)
const result = ref(null)
const snack = ref({ show: false, text: '', color: 'error' })

const headers = [
  { title: 'Callsign', key: 'callsign' },
  { title: 'Nombre',   key: 'full_name' },
  { title: 'Referidos', key: 'referred_count', align: 'center' },
]

const activeCompanies = computed(() => companies.value.filter(c => c.is_active))

const clearResults = () => {
  result.value = null
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

const showSnack = (text, color = 'error') => {
  snack.value = { show: true, text, color }
}

onMounted(loadCompanies)
</script>
