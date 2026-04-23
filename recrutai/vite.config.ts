import path from "path"
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    react(),
    ...(process.env.SENTRY_AUTH_TOKEN ? [sentryVitePlugin({
      org: 'agoriade',
      project: 'javascript-react',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
