import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The dashboard's canonical API is served by FastAPI. The simulator and
      // Wokwi gateway both feed that backend; browser API calls must not bypass it.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Optional direct access to the Wokwi gateway for diagnostics only.
      '/gateway': {
        target: 'http://localhost:8180',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway/, ''),
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
      // New: MineGuard AI FastAPI backend — ML risk engine & AI assessments
      '/backend': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
})

