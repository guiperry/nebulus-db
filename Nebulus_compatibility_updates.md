# NebulusDB Compatibility Updates for Next.js

## Overview

The current NebulusDB package has compatibility issues with Next.js applications, specifically with Server-Side Rendering (SSR) and browser environments. This document outlines the necessary changes to make NebulusDB work seamlessly in Next.js applications.

## Current Issues

### 1. **Dynamic Require Errors**
**Error**: `Dynamic require of "fs" is not supported`
**Cause**: `better-sqlite3` package uses dynamic requires that don't work in browser environments
**Location**: `node_modules/@nebulus-db/core/dist/index.mjs`

### 2. **MemoryAdapter Constructor Error**
**Error**: `MemoryAdapter is not a constructor`
**Cause**: Incorrect adapter initialization or missing adapter exports
**Location**: `database/nebulusdb.ts:36`

### 3. **SSR Compatibility**
**Issue**: Package tries to initialize database during SSR, causing server-side rendering failures
**Impact**: API routes fail to load during server-side rendering

## Required Changes

### 1. **Environment Detection and Conditional Loading**

#### File: `packages/core/src/index.ts`

Add environment detection at the top level:

```typescript
// Environment detection
export const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
export const isSSR = isNode && typeof window === 'undefined';

// Conditional exports
let createDatabase: any;

if (isBrowser) {
  // Browser-compatible version
  createDatabase = async (config: any) => {
    // Use IndexedDB or WebSQL for browser storage
    const { createBrowserDatabase } = await import('./browser-adapter');
    return createBrowserDatabase(config);
  };
} else if (isNode) {
  // Node.js version with better-sqlite3
  createDatabase = async (config: any) => {
    const { createNodeDatabase } = await import('./node-adapter');
    return createNodeDatabase(config);
  };
} else {
  throw new Error('Unsupported environment');
}

export { createDatabase };
```

### 2. **Browser-Compatible Adapter**

#### New File: `packages/core/src/browser-adapter.ts`

```typescript
import type { Database, Collection } from './types';

export async function createBrowserDatabase(config: any): Promise<Database> {
  // Use IndexedDB for browser storage
  const { openDB } = await import('idb');

  const db = await openDB(config.name || 'nebulusdb', 1, {
    upgrade(db) {
      // Create object stores for collections
      config.collections?.forEach((collectionName: string) => {
        if (!db.objectStoreNames.contains(collectionName)) {
          db.createObjectStore(collectionName, { keyPath: '_id' });
        }
      });
    },
  });

  return {
    collection: (name: string, options?: any) => createBrowserCollection(db, name, options),
    close: () => db.close(),
  };
}

function createBrowserCollection(db: any, name: string, options?: any): Collection<any> {
  return {
    insert: async (doc: any) => {
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);
      await store.add(doc);
      return doc;
    },

    find: async (query?: any) => {
      const tx = db.transaction(name, 'readonly');
      const store = tx.objectStore(name);
      const all = await store.getAll();

      if (!query) return all;

      // Simple query filtering (expand as needed)
      return all.filter((doc: any) => {
        for (const [key, value] of Object.entries(query)) {
          if (doc[key] !== value) return false;
        }
        return true;
      });
    },

    findOne: async (query: any) => {
      const results = await this.find(query);
      return results[0] || null;
    },

    update: async (query: any, update: any) => {
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);

      const docs = await store.getAll();
      const doc = docs.find((d: any) => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });

      if (doc) {
        const updated = { ...doc, ...update };
        await store.put(updated);
        return updated;
      }

      return null;
    },

    delete: async (query: any) => {
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);

      const docs = await store.getAll();
      const doc = docs.find((d: any) => {
        for (const [key, value] of Object.entries(query)) {
          if (d[key] !== value) return false;
        }
        return true;
      });

      if (doc) {
        await store.delete(doc._id);
        return true;
      }

      return false;
    },
  };
}
```

### 3. **Node.js Adapter Separation**

#### New File: `packages/core/src/node-adapter.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Database as NebulusDatabase, Collection } from './types';

export async function createNodeDatabase(config: any): Promise<NebulusDatabase> {
  const dbPath = config.path || path.join(process.cwd(), 'nebulusdb.sqlite');

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);

  // Enable foreign keys and other pragmas
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');

  return {
    collection: (name: string, options?: any) => createNodeCollection(sqlite, name, options),
    close: () => sqlite.close(),
  };
}

function createNodeCollection(sqlite: any, name: string, options?: any): Collection<any> {
  // Create table if it doesn't exist
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${name} (
      _id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  sqlite.exec(createTableSQL);

  return {
    insert: async (doc: any) => {
      const stmt = sqlite.prepare(`INSERT INTO ${name} (_id, data) VALUES (?, ?)`);
      stmt.run(doc._id, JSON.stringify(doc));
      return doc;
    },

    find: async (query?: any) => {
      let sql = `SELECT * FROM ${name}`;
      let params: any[] = [];

      if (query) {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(query)) {
          conditions.push(`json_extract(data, '$.${key}') = ?`);
          params.push(value);
        }
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...params);

      return rows.map((row: any) => JSON.parse(row.data));
    },

    findOne: async (query: any) => {
      const results = await this.find(query);
      return results[0] || null;
    },

    update: async (query: any, update: any) => {
      // Find the document first
      const docs = await this.find(query);
      if (docs.length === 0) return null;

      const doc = docs[0];
      const updated = { ...doc, ...update };

      const stmt = sqlite.prepare(`UPDATE ${name} SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE _id = ?`);
      stmt.run(JSON.stringify(updated), doc._id);

      return updated;
    },

    delete: async (query: any) => {
      const docs = await this.find(query);
      if (docs.length === 0) return false;

      const stmt = sqlite.prepare(`DELETE FROM ${name} WHERE _id = ?`);
      stmt.run(docs[0]._id);

      return true;
    },
  };
}
```

### 4. **SSR-Safe Initialization**

#### File: `packages/nebulus-db/src/index.ts`

```typescript
// Lazy initialization to avoid SSR issues
let _createDatabase: any = null;

export async function createDatabase(config: any) {
  if (_createDatabase === null) {
    // Dynamic import based on environment
    if (typeof window !== 'undefined') {
      // Browser environment
      const { createBrowserDatabase } = await import('@nebulus-db/core/browser-adapter');
      _createDatabase = createBrowserDatabase;
    } else {
      // Node.js environment
      const { createNodeDatabase } = await import('@nebulus-db/core/node-adapter');
      _createDatabase = createNodeDatabase;
    }
  }

  return _createDatabase(config);
}
```

### 5. **Package.json Updates**

#### File: `packages/core/package.json`

Add browser-specific exports:

```json
{
  "exports": {
    ".": {
      "browser": "./dist/browser.js",
      "node": "./dist/node.js",
      "default": "./dist/index.js"
    },
    "./browser-adapter": "./dist/browser-adapter.js",
    "./node-adapter": "./dist/node-adapter.js"
  },
  "browser": {
    "better-sqlite3": false,
    "fs": false,
    "path": false
  }
}
```

### 6. **Webpack Configuration**

#### New File: `packages/core/webpack.config.js`

```javascript
const path = require('path');

module.exports = {
  entry: {
    'index': './src/index.ts',
    'browser': './src/browser-adapter.ts',
    'node': './src/node-adapter.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
    'fs': 'commonjs fs',
    'path': 'commonjs path'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        browser: {
          test: /browser-adapter/,
          name: 'browser',
          enforce: true
        },
        node: {
          test: /node-adapter/,
          name: 'node',
          enforce: true
        }
      }
    }
  }
};
```

### 7. **Type Definitions Update**

#### File: `packages/core/src/types.ts`

```typescript
export interface Database {
  collection<T = any>(name: string, options?: CollectionOptions): Collection<T>;
  close(): Promise<void> | void;
}

export interface Collection<T = any> {
  insert(doc: T): Promise<T>;
  find(query?: any): Promise<T[]>;
  findOne(query: any): Promise<T | null>;
  update(query: any, update: Partial<T>): Promise<T | null>;
  delete(query: any): Promise<boolean>;
}

export interface CollectionOptions {
  indexes?: Array<{
    name: string;
    fields: string[];
    type: 'unique' | 'single';
  }>;
}
```

## Implementation Steps

1. **Create separate adapters** for browser and Node.js environments
2. **Add environment detection** to prevent SSR issues
3. **Update build system** to create separate bundles
4. **Add proper externals** for Node.js modules
5. **Test in both environments** (browser and Node.js)
6. **Update documentation** with Next.js usage examples

## Testing

### Browser Environment Test
```typescript
// Should work in browser without errors
import { createDatabase } from '@nebulus-db/nebulus-db';

const db = await createDatabase({
  name: 'test-db',
  collections: ['users', 'posts']
});
```

### Node.js Environment Test
```typescript
// Should work in Node.js with SQLite
import { createDatabase } from '@nebulus-db/nebulus-db';

const db = await createDatabase({
  storage: 'sqlite',
  path: './data/test.db'
});
```

### Next.js SSR Test
```typescript
// Should not cause SSR errors
import { createDatabase } from '@nebulus-db/nebulus-db';

// Only use in API routes or client components
export default function Component() {
  // This should work without SSR issues
  return <div>Database component</div>;
}
```

## Benefits of These Changes

1. **SSR Compatibility**: No more dynamic require errors during server-side rendering
2. **Browser Support**: Full IndexedDB support for client-side storage
3. **Node.js Performance**: Maintains SQLite performance for server environments
4. **Environment Flexibility**: Automatically chooses the right adapter
5. **Bundle Optimization**: Separate bundles prevent unnecessary code in each environment

## Migration Path

For existing NebulusDB users:

1. Update to the new version
2. No code changes required - API remains the same
3. Automatic environment detection handles the rest
4. Existing data can be migrated using the new adapters

This implementation will make NebulusDB fully compatible with Next.js and other SSR frameworks while maintaining performance and functionality.