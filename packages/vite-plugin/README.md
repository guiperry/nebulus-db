# @nebulus-db/vite-plugin

Vite plugin for NebulusDB - Simplify NebulusDB integration in Vite projects with virtual modules.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/vite-plugin @nebulus-db/core vite
```

## Usage

### Basic Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import nebulusDBPlugin from '@nebulus-db/vite-plugin';

export default defineConfig({
  plugins: [
    nebulusDBPlugin({
      adapter: 'memory',
      collections: ['users', 'posts']
    })
  ]
});
```

```typescript
// main.ts
import db from 'virtual:nebulus-db';

// Use the database
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

### Advanced Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import nebulusDBPlugin from '@nebulus-db/vite-plugin';

export default defineConfig({
  plugins: [
    nebulusDBPlugin({
      virtualModuleName: 'virtual:nebulus-db', // Default
      adapter: 'sqlite',
      adapterOptions: {
        path: './data/app.db'
      },
      plugins: [
        { name: 'validation' },
        { name: 'cache', options: { maxSize: 100 } }
      ],
      devtools: true,
      devtoolsOptions: {
        port: 3333,
        autoOpen: true
      },
      collections: ['users', 'posts', 'comments']
    })
  ]
});
```

## Configuration Options

### `NebulusDBPluginOptions`

```typescript
interface NebulusDBPluginOptions {
  virtualModuleName?: string;  // Virtual module name (default: 'virtual:nebulus-db')
  adapter?: 'memory' | 'localstorage' | 'indexeddb' | 'filesystem' | 'sqlite' | 'redis';
  adapterOptions?: Record<string, any>;  // Adapter-specific options
  plugins?: Array<{
    name: string;
    options?: Record<string, any>;
  }>;
  devtools?: boolean;  // Enable DevTools (default: false)
  devtoolsOptions?: {
    port?: number;
    autoOpen?: boolean;
  };
  collections?: string[];  // Collections to pre-create
}
```

## Supported Adapters

- `memory`: In-memory storage (default)
- `localstorage`: Browser localStorage
- `indexeddb`: Browser IndexedDB
- `filesystem`: Node.js file system
- `sqlite`: SQLite database
- `redis`: Redis (via adapter-memorydb)

## Virtual Module

The plugin creates a virtual module that you can import in your code:

```typescript
import db from 'virtual:nebulus-db';
```

This provides a pre-configured NebulusDB instance with your specified adapter, plugins, and collections.

## DevTools Integration

When `devtools: true`, the plugin serves the NebulusDB DevTools UI at `/__nebulus-devtools` and provides a `nebulusDevtools` export.

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
