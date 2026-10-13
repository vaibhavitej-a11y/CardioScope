import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiProxy = { '/api': 'http://127.0.0.1:8001' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: apiProxy,
  },
  // Keep the same API connection when reviewing the production build locally.
  preview: { proxy: apiProxy },
})
