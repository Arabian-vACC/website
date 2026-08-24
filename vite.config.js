import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/atc': {
        target: 'https://api.vatsim.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/atc/, '/v2/atc/online')
      },
      '/api/data': {
        target: 'https://data.vatsim.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/data/, '/v3/vatsim-data.json')
      },
      '/api/bookings': {
        target: 'https://atc-bookings.vatsim.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bookings/, '/api/booking?division=MENA&subdivision=ARB')
      },
      '/api/events': {
        target: 'https://my.vatsim.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/events/, '/api/v2/events/view/division/MENA')
      },
      '/api/stats': {
        target: 'https://www.vatsim-arabian.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
