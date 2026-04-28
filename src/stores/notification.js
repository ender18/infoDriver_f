import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const show = ref(false)
  const text = ref('')
  const color = ref('error')

  const notify = (message, c = 'error') => {
    text.value = message
    color.value = c
    show.value = true
  }

  return { show, text, color, notify }
})
