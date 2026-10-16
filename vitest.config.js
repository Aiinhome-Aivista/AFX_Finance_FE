import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://127.0.0.1:5000') },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.js'], testTimeout: 30000, environmentOptions: { jsdom: { url: 'http://localhost:5173/' } } },
})
