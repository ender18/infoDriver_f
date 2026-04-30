import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/services/api'

// Derivar la base URL de apiClient para no duplicar la configuración
const API_BASE = apiClient.defaults.baseURL

export const useToolsStore = defineStore('tools', () => {
  const accountsLoading         = ref(false)
  const accountsRefreshing      = ref(false)
  const accountsProcessing      = ref(false)
  const accountsProgress        = ref({ page: 0, total_pages: 0 })
  const accountsProcessProgress = ref({ done: 0, total: 0, errors: 0 })
  const accountsResult          = ref({ company: null, drivers_with_balance: 0, fetched_at: null, results: [] })
  const accountsError           = ref(null)

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function _consumeSSE(response, onEvent) {
    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop()
      for (const chunk of chunks) {
        if (!chunk.startsWith('data: ')) continue
        let event
        try { event = JSON.parse(chunk.slice(6)) } catch { continue }
        onEvent(event)
      }
    }
  }

  function _normalizeDriver(d) {
    return {
      driver_id:              d.driverId,
      callsign:               d.callsign       ?? '',
      forename:               d.forename,
      surname:                d.surname,
      bank_name:              d.bankName        ?? '',
      bank_sort_code:         d.bankSortCode    ?? '',
      current_balance:        d.currentBalance,
      outstanding_amount:     d.outstandingAmount,
      all_jobs_total:         d.allJobsTotal,
      all_jobs_commission:    d.allJobsCommission,
      notes:                  d.notes           ?? '',
      process_status:         null,
      process_result:         null,
      process_balance_before: null,
      processed_at:           null,
    }
  }

  // ── Acción 1 — Leer datos guardados en BD ────────────────────────────────

  async function loadStoredAccounts(companyId) {
    accountsLoading.value = true
    accountsError.value   = null
    try {
      const { data } = await apiClient.get('/tools/drivers/accounts', {
        params: { company_id: companyId }
      })
      accountsResult.value = data
    } catch (err) {
      accountsError.value = { code: err.response?.status }
    } finally {
      accountsLoading.value = false
    }
  }

  // ── Acción 2 — Refrescar desde API externa (SSE) ─────────────────────────

  async function refreshAccounts(companyId, token) {
    accountsRefreshing.value = true
    accountsError.value      = null
    accountsProgress.value   = { page: 0, total_pages: 0 }
    accountsResult.value     = { company: null, drivers_with_balance: 0, fetched_at: null, results: [] }

    let response
    try {
      response = await fetch(
        `${API_BASE}/tools/drivers/accounts/refresh?company_id=${companyId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch {
      accountsError.value      = { code: 0, detail: 'No se pudo conectar al servidor.' }
      accountsRefreshing.value = false
      return
    }

    if (!response.ok) {
      accountsError.value      = { code: response.status }
      accountsRefreshing.value = false
      return
    }

    try {
      await _consumeSSE(response, (event) => {
        if (event.type === 'init') {
          accountsResult.value.company = event.company
          accountsProgress.value       = { page: 0, total_pages: event.total_pages }

        } else if (event.type === 'page') {
          accountsProgress.value.page = event.page
          const rows = (event.new_results ?? []).map(_normalizeDriver)
          accountsResult.value.results.push(...rows)
          accountsResult.value.drivers_with_balance = accountsResult.value.results.length

        } else if (event.type === 'done') {
          accountsResult.value.fetched_at = new Date().toISOString()
          accountsRefreshing.value        = false

        } else if (event.type === 'error') {
          accountsError.value      = event
          accountsRefreshing.value = false
        }
      })
    } finally {
      accountsRefreshing.value = false
    }
  }

  // ── Acción 3 — Procesar un conductor individual (JSON, Axios) ─────────────

  async function processSingleDriver(companyId, driverId) {
    const row = accountsResult.value.results.find(r => r.driver_id === driverId)
    if (row) row.process_status = 'processing'

    try {
      const { data } = await apiClient.post(
        `/tools/drivers/accounts/process/${driverId}`,
        null,
        { params: { company_id: companyId } }
      )
      if (row) {
        row.process_status         = data.status
        row.process_result         = data.result         ?? null
        row.process_balance_before = data.balance_before ?? null
        row.current_balance        = data.current_balance
        row.processed_at           = data.processed_at   ?? new Date().toISOString()
      }
      return data
    } catch (err) {
      if (row) {
        row.process_status = 'error'
        row.process_result = err.response?.data?.detail ?? 'Error desconocido'
      }
      throw err
    }
  }

  // ── Acción 4 — Proceso masivo: loop de llamadas individuales ─────────────

  async function processBulk(companyId) {
    accountsProcessing.value      = true
    accountsProcessProgress.value = { done: 0, total: accountsResult.value.results.length, errors: 0 }

    for (const row of [...accountsResult.value.results]) {
      try {
        await processSingleDriver(companyId, row.driver_id)
      } catch {
        accountsProcessProgress.value.errors++
      }
      accountsProcessProgress.value.done++
    }

    accountsProcessing.value = false
  }

  // ── Limpiar ───────────────────────────────────────────────────────────────

  function clearAccounts() {
    accountsLoading.value         = false
    accountsRefreshing.value      = false
    accountsProcessing.value      = false
    accountsProgress.value        = { page: 0, total_pages: 0 }
    accountsProcessProgress.value = { done: 0, total: 0, errors: 0 }
    accountsResult.value          = { company: null, drivers_with_balance: 0, fetched_at: null, results: [] }
    accountsError.value           = null
  }

  return {
    accountsLoading,
    accountsRefreshing,
    accountsProcessing,
    accountsProgress,
    accountsProcessProgress,
    accountsResult,
    accountsError,
    loadStoredAccounts,
    refreshAccounts,
    processSingleDriver,
    processBulk,
    clearAccounts,
  }
})
