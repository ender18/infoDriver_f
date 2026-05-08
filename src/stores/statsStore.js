import { defineStore } from 'pinia'
import { getBookingsSummary } from '@/api/stats'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    isLoading: false,
    result:    null,   // { date_from, date_to, summary, by_day[] }
    error:     null,
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
  },
})
