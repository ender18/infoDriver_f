<template>
  <MainLayout>
    <div class="mb-4">
      <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/tools')">
        Volver a Herramientas
      </v-btn>
    </div>

    <div class="text-h5 font-weight-bold mb-2">Transferencia SPEI</div>
    <v-divider class="mb-6" color="deep-purple" :thickness="2" style="max-width: 60px;" />

    <v-row>
      <!-- ── Formulario ─────────────────────────────── -->
      <v-col cols="12" md="6">
        <v-card elevation="0" border>
          <v-card-text class="pa-5">
            <v-form ref="formRef" @submit.prevent="submit">
              <v-row dense>

                <!-- Compañía -->
                <v-col cols="12">
                  <div class="text-caption text-medium-emphasis font-weight-medium mb-3 text-uppercase">
                    Configuración
                  </div>
                  <v-autocomplete
                    v-model="form.company_id"
                    :items="companies"
                    item-title="name"
                    item-value="id"
                    label="Compañía *"
                    variant="outlined"
                    density="compact"
                    :loading="loadingCompanies"
                    :rules="[v => !!v || 'Requerido']"
                    no-data-text="Sin compañías"
                  >
                    <template #item="{ item, props }">
                      <v-list-item v-bind="props">
                        <template #append>
                          <v-icon
                            :color="peiboOk(item.raw) ? 'success' : 'warning'"
                            size="16"
                          >
                            {{ peiboOk(item.raw) ? 'mdi-bank-check' : 'mdi-bank-off' }}
                          </v-icon>
                        </template>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                </v-col>

                <!-- Concepto -->
                <v-col cols="12" sm="7">
                  <v-text-field
                    v-model="form.concept"
                    label="Concepto *"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || 'Requerido', v => v.length <= 40 || 'Máx 40 caracteres']"
                    counter="40"
                  />
                </v-col>

                <!-- Referencia -->
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="form.reference"
                    label="Referencia *"
                    variant="outlined"
                    density="compact"
                    hint="Máx 7 dígitos"
                    persistent-hint
                    :rules="[v => !!v || 'Requerido', v => v.length <= 7 || 'Máx 7 dígitos']"
                  >
                    <template #append-inner>
                      <v-tooltip text="Generar referencia aleatoria" location="top">
                        <template #activator="{ props }">
                          <v-icon
                            v-bind="props"
                            size="18"
                            color="primary"
                            style="cursor: pointer;"
                            @click="generateReference"
                          >
                            mdi-dice-5
                          </v-icon>
                        </template>
                      </v-tooltip>
                    </template>
                  </v-text-field>
                </v-col>

                <!-- Monto -->
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="form.amount"
                    label="Monto (MXN) *"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                    hint="Ej: 1500.00"
                    persistent-hint
                    :rules="[v => !!v || 'Requerido', v => /^\d+(\.\d{1,2})?$/.test(v) || 'Formato inválido']"
                  />
                </v-col>

                <!-- Separador beneficiario -->
                <v-col cols="12">
                  <v-divider class="my-1" />
                  <div class="text-caption text-medium-emphasis font-weight-medium mt-3 mb-1 text-uppercase">
                    Beneficiario
                  </div>
                </v-col>

                <!-- Nombre -->
                <v-col cols="12">
                  <v-text-field
                    v-model="form.beneficiary_name"
                    label="Nombre completo *"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || 'Requerido', v => v.length <= 40 || 'Máx 40 caracteres']"
                  />
                </v-col>

                <!-- Cuenta + Tipo -->
                <v-col cols="12" sm="8">
                  <v-text-field
                    v-model="form.beneficiary_account"
                    label="Cuenta *"
                    variant="outlined"
                    density="compact"
                    hint="CLABE 18 dígitos"
                    persistent-hint
                    :rules="[
                      v => !!v || 'Requerido',
                      v => v.length >= 10 || 'Mínimo 10 dígitos',
                      v => v.length <= 18 || 'Máximo 18 dígitos',
                    ]"
                  />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="form.beneficiary_account_type"
                    :items="['CLABE','TDD','CELULAR']"
                    label="Tipo *"
                    variant="outlined"
                    density="compact"
                    :rules="[v => !!v || 'Requerido']"
                  />
                </v-col>

                <!-- Banco -->
                <v-col cols="12">
                  <v-autocomplete
                    v-model="form.beneficiary_bank"
                    :items="banks"
                    item-title="display"
                    item-value="code"
                    label="Banco *"
                    variant="outlined"
                    density="compact"
                    :loading="loadingBanks"
                    no-data-text="Sin resultados"
                    :rules="[v => !!v || 'Requerido']"
                  />
                </v-col>

                <!-- RFC -->
                <v-col cols="12">
                  <v-text-field
                    v-model="form.beneficiary_tax_id"
                    label="RFC del beneficiario"
                    variant="outlined"
                    density="compact"
                    hint="Opcional — 12 a 13 caracteres"
                    persistent-hint
                    :rules="[v => !v || (v.length >= 12 && v.length <= 13) || '12 a 13 caracteres']"
                  />
                </v-col>

              </v-row>
            </v-form>
          </v-card-text>

          <v-card-actions class="px-5 pb-5">
            <v-spacer />
            <v-btn variant="text" @click="resetForm">Limpiar</v-btn>
            <v-btn
              color="deep-purple"
              variant="flat"
              append-icon="mdi-send"
              :loading="sending"
              @click="submit"
            >
              Enviar transferencia
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- ── Panel de resultado ─────────────────────── -->
      <v-col cols="12" md="6">
        <!-- Estado vacío -->
        <v-card v-if="!result && !error" elevation="0" border height="100%" class="d-flex align-center justify-center">
          <div class="text-center text-medium-emphasis pa-10">
            <v-icon size="56" class="mb-3" color="grey-lighten-1">mdi-bank-transfer-out</v-icon>
            <div class="text-body-2">El resultado aparecerá aquí después de enviar</div>
          </div>
        </v-card>

        <!-- Éxito -->
        <v-card v-else-if="result" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex align-center gap-2 mb-4">
              <v-icon color="success" size="24">mdi-check-circle</v-icon>
              <span class="text-body-1 font-weight-bold text-success">Transferencia enviada</span>
            </div>

            <v-list density="compact" class="pa-0">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="secondary" class="mr-2">mdi-identifier</v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">transaction_id</v-list-item-title>
                <v-list-item-subtitle class="text-body-2 font-weight-medium mt-1">
                  {{ result.transaction_id }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="primary" class="mr-2">mdi-qrcode</v-icon>
                </template>
                <v-list-item-title class="text-caption text-medium-emphasis">tracking_code</v-list-item-title>
                <v-list-item-subtitle class="mt-1">
                  <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
                    {{ result.tracking_code }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-4" />

            <div class="text-caption text-medium-emphasis font-weight-medium mb-2">JSON completo</div>
            <v-sheet color="grey-lighten-4" rounded class="pa-3">
              <pre class="text-caption" style="white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(result, null, 2) }}</pre>
            </v-sheet>
          </v-card-text>
        </v-card>

        <!-- Error -->
        <v-card v-else-if="error" elevation="0" border>
          <v-card-text class="pa-5">
            <div class="d-flex align-center gap-2 mb-4">
              <v-icon color="error" size="24">mdi-alert-circle</v-icon>
              <span class="text-body-1 font-weight-bold text-error">Error en la transferencia</span>
            </div>

            <v-alert type="error" variant="tonal" class="text-body-2">
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import apiClient from '@/services/api'

const companies       = ref([])
const banks           = ref([])
const loadingCompanies = ref(false)
const loadingBanks    = ref(false)
const sending         = ref(false)
const result          = ref(null)
const error           = ref(null)
const formRef         = ref(null)

const generateReference = () => {
  form.value.reference = String(Math.floor(1000000 + Math.random() * 9000000))
}

const emptyForm = () => ({
  company_id:               null,
  concept:                  '',
  reference:                '',
  amount:                   '',
  beneficiary_account:      '',
  beneficiary_name:         '',
  beneficiary_bank:         '',
  beneficiary_account_type: 'CLABE',
  beneficiary_tax_id:       '',
  latitude:                 '19.388113',
  longitude:                '-99.252684',
})

const form = ref(emptyForm())

const peiboOk = (c) => !!(c.peibo_customer_key && c.peibo_api_key)

const loadCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { data } = await apiClient.get('/companies/', { params: { skip: 0, limit: 200 } })
    companies.value = data
  } finally {
    loadingCompanies.value = false
  }
}

const loadBanks = async () => {
  loadingBanks.value = true
  try {
    const { data } = await apiClient.get('/banks/')
    banks.value = data.map(b => ({ ...b, display: `${b.code} — ${b.name}` }))
  } finally {
    loadingBanks.value = false
  }
}

const submit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  sending.value = true
  result.value  = null
  error.value   = null

  try {
    const payload = {
      company_id:               form.value.company_id,
      concept:                  form.value.concept,
      reference:                form.value.reference,
      amount:                   form.value.amount,
      beneficiary_account:      form.value.beneficiary_account,
      beneficiary_name:         form.value.beneficiary_name,
      beneficiary_bank:         form.value.beneficiary_bank,
      beneficiary_account_type: form.value.beneficiary_account_type,
      beneficiary_tax_id:       form.value.beneficiary_tax_id || null,
      latitude:                 form.value.latitude,
      longitude:                form.value.longitude,
    }
    const { data } = await apiClient.post('/payments/transfer', payload)
    result.value = data
  } catch (err) {
    const detail = err.response?.data?.detail
    error.value = detail ?? 'Error inesperado al enviar la transferencia'
  } finally {
    sending.value = false
  }
}

const resetForm = () => {
  form.value  = emptyForm()
  result.value = null
  error.value  = null
  formRef.value?.resetValidation()
}

onMounted(() => {
  loadCompanies()
  loadBanks()
})
</script>
