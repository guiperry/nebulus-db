import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      '**/._*',
      '**/.DS_Store'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../packages/core/src/transaction.ts',
        '../packages/core/src/db.ts',
        '../packages/core/src/collection.ts'
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts'
      ],
      all: false,
      reportsDirectory: './coverage',
      enabled: true
    }
  },
  resolve: {
    alias: {
      '@nebulus/core': resolve(__dirname, '../packages/core/src'),
      '@nebulus/adapter-memorydb': resolve(__dirname, '../packages/adapters/memory/src'),
      '@nebulus/adapter-sqlite': resolve(__dirname, '../packages/adapters/sqlite/src'),
      '@nebulus/plugin-cache': resolve(__dirname, '../packages/plugins/cache/src'),
      '@nebulus/plugin-validation': resolve(__dirname, '../packages/plugins/validation/src')
    }
  }
});
