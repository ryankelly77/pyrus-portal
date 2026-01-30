import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: [
      // Old Jest tests that need migration
      'src/__tests__/example.test.ts',
      'src/__tests__/adminClientsRoute.test.ts',
      'src/__tests__/adminNotificationsRoute.test.ts',
      'src/__tests__/requireAdmin.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
