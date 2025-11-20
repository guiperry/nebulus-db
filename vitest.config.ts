import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      './packages/*/tests/**/*.test.ts',
      './packages/*/src/**/*.test.ts',
      './tools/*/src/test/**/*.test.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '**/._*.test.ts',  // Exclude macOS hidden files
      '**/._*',          // Exclude all macOS hidden files
      '**/.DS_Store'     // Exclude macOS .DS_Store files
    ],
    coverage: {
      all: true,
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**', '**/*.d.ts'],
      reporter: ['text', 'html'],
    }
  },
  resolve: {
    alias: {
      '@nebulus/core': resolve(__dirname, './packages/core/src'),
      '@nebulus/adapter-memorydb': resolve(__dirname, './packages/adapters/memory/src'),
      '@nebulus/adapter-indexeddb': resolve(__dirname, './packages/adapters/indexeddb/src'),
      '@nebulus/adapter-filesystemdb': resolve(__dirname, './packages/adapters/filesystem/src'),
      '@nebulus/plugin-encryption': resolve(__dirname, './packages/plugins/encryption/src'),
      '@nebulus/plugin-validation': resolve(__dirname, './packages/plugins/validation/src'),
      '@nebulus/plugin-versioning': resolve(__dirname, './packages/plugins/versioning/src')
    }
  }
});
