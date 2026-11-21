import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/agentforgex/',
  // base: '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://aivista.co.in/afx-finance',
        changeOrigin: true,
      },
    },
  },
})

