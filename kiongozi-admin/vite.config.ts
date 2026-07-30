import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://api.kiongozi.org',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'wss://api.kiongozi.org',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
