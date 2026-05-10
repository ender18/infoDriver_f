import { defineStore } from 'pinia'
import { getBookingsSummary, getDriversSummary } from '@/api/stats'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    isLoading:        false,
    result:           null,
    error:            null,
    isLoadingDrivers: false,
    driversResult:    null,
  }),
  actions: {
    async fetchBookingsSummary(dateFrom, dateTo) {
      this.isLoading = true
      this.error     = null
      this.result    = null
      try {
        const { data } = await getBookingsSummary(dateFrom, dateTo)
        this.result = data
      } catch (err) {
        this.error = { code: err.response?.status, detail: err.response?.data?.detail }
      } finally {
        this.isLoading = false
      }
    },
    clear() {
      this.isLoading = false
      this.result    = null
      this.error     = null
    },
    async fetchDriversSummary(companyId) {
      this.isLoadingDrivers = true
      this.driversResult    = null
      try {
        const { data } = await getDriversSummary(companyId)
        this.driversResult = data
      } catch (err) {
        throw err
      } finally {
        this.isLoadingDrivers = false
      }
    },
    clearDrivers() {
      this.driversResult = null
    },
  },
})
