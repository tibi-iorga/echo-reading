import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react-pdf'],
  },
  server: {
    // In dev, the local API server (dev/server.ts) handles /api/* on port 4000.
    // Production deploys app/api/* as Vercel functions on the same origin, so
    // no proxy is needed there. This block is dev-only.
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.DEV_API_PORT ?? 4000}`,
        changeOrigin: true,
      },
    },
  },
})
