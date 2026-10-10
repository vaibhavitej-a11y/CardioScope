import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // 8000 is taken by another local project (AnantaQ) on this machine —
      // the prediction service runs on 8001.
      '/api': 'http://127.0.0.1:8001',
    },
  },
})
