import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxies /api/gtfs/* → https://opendata.waltti.fi/jyvaskyla/api/gtfsrealtime/v1.0/feed/*
      // This avoids CORS issues during dev. When the Rust backend is ready,
      // remove this proxy and point api/gtfs.ts at your backend instead.
      '/api/gtfs': {
        target: 'https://opendata.waltti.fi',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/gtfs/, '/jyvaskyla/api/gtfsrealtime/v1.0/feed'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})