// src/plugins/vuetify.js
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1a5c45',
          secondary: '#3ecfa0',
          accent: '#3ecfa0',
          error: '#b53a2f',
          info: '#1a5c7a',
          success: '#2d9e7a',
          warning: '#d97706',
        },
      },
    },
  },
})

export default vuetify