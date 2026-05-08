import api from '@/services/api'

export const getBookingsSummary = (dateFrom, dateTo) =>
  api.get('/stats/bookings/summary', {
    params: { date_from: dateFrom, date_to: dateTo }
  })
