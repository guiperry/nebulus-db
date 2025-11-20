<div align="center">

<img src="./assets/nebuluslogo.png" alt="NebulusDB Logo" width="400" />

# NebulusDB

**Fast. Flexible. Serverless. The embedded database for the modern stack.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![npm version](https://img.shields.io/badge/npm-v0.2.2-blue)](https://www.npmjs.com/package/@nebulus-db/nebulus-db)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-NebulusDB-orange)](https://www.producthunt.com/products/nebulusdb)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Nom-nom-hub/NebulusDB/build.yml?branch=main)](https://github.com/Nom-nom-hub/NebulusDB/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/Nom-nom-hub/NebulusDB)](https://codecov.io/gh/Nom-nom-hub/NebulusDB)
[![Downloads](https://img.shields.io/npm/dm/@nebulus-db/core)](https://www.npmjs.com/package/@nebulus-db/core)
[![GitHub Stars](https://img.shields.io/github/stars/Nom-nom-hub/NebulusDB)](https://github.com/Nom-nom-hub/NebulusDB/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/Nom-nom-hub/NebulusDB)](https://github.com/Nom-nom-hub/NebulusDB/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/Nom-nom-hub/NebulusDB)](https://github.com/Nom-nom-hub/NebulusDB/pulls)
[![Node.js Version](https://img.shields.io/node/v/@nebulus-db/core)](https://nodejs.org/)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@nebulus-db/core)](https://bundlephobia.com/package/@nebulus-db/core)
[![Last Commit](https://img.shields.io/github/last-commit/Nom-nom-hub/NebulusDB)](https://github.com/Nom-nom-hub/NebulusDB/commits/main)

</div>

NebulusDB is a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL distributed database that runs in the browser, Node.js, and Edge environments. It features advanced indexing, optimized query processing, modular adapters for persistence, reactive live queries, extensibility via plugins, and blazing-fast in-memory operations with adaptive concurrency control.

## Latest Release: v0.2.2 (April 26, 2025)

The latest release includes significant improvements to error handling and recovery mechanisms:

- Fixed TypeScript errors and improved interface implementations
- Added comprehensive test suite for error handling and recovery
- Improved resilience against data corruption and network interruptions
- Enhanced transaction system robustness

[Check us out on Product Hunt!](https://www.producthunt.com/products/nebulusdb)

## Project Status

- **Build Status**: Continuous integration status for the main branch
- **Coverage Status**: Code coverage percentage from automated tests
- **Downloads**: Monthly downloads from npm
- **GitHub Stars**: Number of GitHub stars the project has received
- **GitHub Issues**: Number of open issues
- **GitHub PRs**: Number of open pull requests
- **Node.js Version**: Minimum required Node.js version
- **Bundle Size**: Minified + gzipped size of the core package
- **Last Commit**: Date of the last commit to the main branch

## Features

- 🚀 **Blazing Fast**: Optimized in-memory operations with advanced indexing and query caching
- 🔄 **Reactive**: Live queries that update in real-time
- 📐 **TypeScript-First**: Full type safety with your data
- 🧩 **Modular**: Use only what you need with adapters and plugins
- 🌐 **Universal**: Works in browsers, Node.js, and Edge environments
- 🔌 **Extensible**: Create custom adapters and plugins
- 📊 **Optimized**: B-tree indexing, batch operations, and adaptive concurrency control
- 💾 **Efficient**: Document compression and memory management for large datasets
- 🔍 **Smart Queries**: Query optimization with short-circuit evaluation and index selection

## Installation

### Requirements

- **Node.js 18.x or higher** (required for development and optimal performance)
- npm 8.x or higher

### Simple Installation (Recommended)

```bash
# Install the main package
npm install @nebulus-db/nebulus-db
```

### Advanced Installation (For more control)

```bash
# Install core package
npm install @nebulus-db/core

# Install adapters as needed (localstorage is built-in)
npm install @nebulus-db/adapter-indexeddb
npm install @nebulus-db/adapter-filesystemdb

# Install plugins as needed
npm install @nebulus-db/plugin-encryption
npm install @nebulus-db/plugin-validation
npm install @nebulus-db/plugin-versioning
```

> **Important**: Development dependencies require Node.js 18+. The core library is designed to work with Node.js 18+ for optimal performance and compatibility with modern JavaScript features.
>
> If you're running on Node.js 16.x, you can bypass the version check for development purposes by setting the `Nebulus_SKIP_VERSION_CHECK=1` environment variable:
> ```
> Nebulus_SKIP_VERSION_CHECK=1 npm run <command>
> ```
> Note that this is only recommended for development and testing purposes. Production use should always use Node.js 18+.

## Quick Start

### Simple Usage (Recommended)

```typescript
import { createDatabase } from '@nebulus-db/nebulus-db';

// Create a database with in-memory storage (default)
const db = createDatabase();

// Create a database with localStorage (for browsers)
const browserDb = createDatabase({ storage: 'localStorage' });

// Create a database with file system storage (for Node.js)
const nodeDb = createDatabase({
  storage: 'fileSystem',
  path: './my-database'
});

// Create a database with validation
const validatedDb = createDatabase({ validation: true });
```

### Advanced Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';

// Create a database with in-memory adapter and optimized settings
const db = createDb({
  adapter: new MemoryAdapter(),
  // Enable query caching for better performance
  queryCache: { enabled: true, maxSize: 100 },
  // Enable adaptive concurrency for parallel operations
  concurrency: { enabled: true, initialConcurrency: 4 },
  // Enable document compression for large datasets
  compression: { enabled: true, threshold: 1024 }
});

// Create a collection with indexes for faster queries
const users = db.collection('users', {
  indexes: [
    { name: 'id_idx', fields: ['id'], type: 'unique' },
    { name: 'age_idx', fields: ['age'], type: 'single' }
  ]
});

// Batch insert for better performance
await users.insertBatch([
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 }
]);

// Query documents (uses indexes automatically)
const result = await users.find({ age: { $gt: 20 } });
console.log(result); // [{ id: '1', name: 'Alice', age: 30 }, ...]

// Batch update for better performance
await users.updateBatch(
  [{ id: '1' }, { id: '2' }],
  [{ $set: { active: true } }, { $set: { active: false } }]
);

// Batch delete for better performance
await users.deleteBatch([{ id: '3' }]);

// Subscribe to changes (reactive queries)
users.subscribe({ age: { $gt: 30 } }, (result) => {
  console.log('Users over 30:', result);
});

// Process large datasets in chunks to avoid memory issues
await users.processInChunks(async (docs) => {
  // Process each chunk of documents
  return docs.map(doc => ({ ...doc, processed: true }));
});
```

## Why NebulusDB?

NebulusDB was designed to solve common challenges in modern web and application development:

- **Simplified Data Management**: No need to set up and maintain a separate database server
- **High Performance**: Advanced indexing, query optimization, and adaptive concurrency
- **Offline-First Development**: Built for applications that need to work offline
- **Reactive UI Updates**: Real-time UI updates without complex state management
- **TypeScript Integration**: First-class TypeScript support for type safety
- **Flexible Schema**: Adapt to changing requirements without migrations
- **Lightweight**: Small bundle size, perfect for edge computing and mobile devices
- **Scalable**: Efficient memory management and document compression for large datasets
- **Batch Operations**: Optimized for bulk inserts, updates, and deletes

## Comparison

Here's how NebulusDB compares to other embedded databases:

| Feature | NebulusDB | LokiJS | PouchDB | Lowdb |
|---------|----------|--------|---------|-------|
| TypeScript-first | ✅ | ❌ | ❌ | ✅ |
| Reactive queries | ✅ | ❌ | ✅ | ❌ |
| Plugin system | ✅ | ❌ | ✅ | ❌ |
| Schema validation | ✅ | ❌ | ❌ | ❌ |
| Browser support | ✅ | ✅ | ✅ | ✅ |
| Node.js support | ✅ | ✅ | ✅ | ✅ |
| Edge runtime support | ✅ | ❌ | ❌ | ❌ |
| Advanced indexing | ✅ | ⚠️ | ⚠️ | ❌ |
| Query optimization | ✅ | ❌ | ❌ | ❌ |
| Batch operations | ✅ | ⚠️ | ✅ | ❌ |
| Document compression | ✅ | ❌ | ✅ | ❌ |
| Adaptive concurrency | ✅ | ❌ | ❌ | ❌ |
| Memory management | ✅ | ⚠️ | ❌ | ❌ |
| Bundle size | Small | Medium | Large | Small |

## Performance

NebulusDB is designed for high performance. Here are some benchmark results:

| Operation (10,000 docs) | NebulusDB | RxDB | LokiJS |
|-------------------------|----------|------|--------|
| Batch Insert            | 8.05ms   | 87ms | 42ms   |
| Find All                | 0.02ms   | 5ms  | 2ms    |
| Find with Query         | 0.69ms   | 12ms | 8ms    |
| Batch Delete            | 61.45ms  | 120ms| 95ms   |

### Optimizations

- **Advanced Indexing**: B-tree implementation for efficient range queries
- **Query Caching**: Automatic caching of query results for repeated queries
- **Batch Operations**: Optimized bulk operations with parallel processing
- **Document Compression**: Automatic compression of large documents
- **Memory Management**: Efficient memory usage with chunked processing
- **Adaptive Concurrency**: Automatic tuning of concurrency levels based on workload

## Documentation

For full documentation, visit [docs/README.md](docs/README.md).

## Examples

Check out the [examples](examples/) directory for complete working examples:

- [Node.js Example](examples/node-demo/): A simple CLI application using NebulusDB with file system persistence
- [Browser Example](examples/browser-demo/): A todo application using NebulusDB with localStorage persistence

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Node.js Version Issues

If you encounter errors related to Node.js version compatibility:

1. **Update Node.js**: The recommended solution is to update to Node.js 18 or higher.
   - Download from [nodejs.org](https://nodejs.org/)
   - Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

2. **Bypass Version Check**: For development only, you can bypass the version check:
   ```
   Nebulus_SKIP_VERSION_CHECK=1 npm run <command>
   ```

3. **Engine Warnings**: If you see `EBADENGINE` warnings but the installation completes, these are just warnings and can be ignored for development purposes.

### Common Issues

- **ESLint Errors**: If you encounter ESLint errors, run `npm run lint -- --fix` to automatically fix many common issues.

- **Test Failures**: Make sure you're using Node.js 18+ for running tests. Some test features require modern JavaScript capabilities.

- **Build Errors**: If you encounter build errors, try running `npm run clean` followed by `npm run build`.

## License

MIT

> **Note:** If you are running NebulusDB in the browser, some cryptographic functions (like `crypto.randomFillSync`) may not be available. A simple polyfill is provided in the demo, but it is NOT cryptographically secure. For production, ensure your environment provides the necessary crypto APIs or use a secure polyfill.

## Build Instructions

To build the project:

- **On Windows:**
  ```sh
  npm run build:win
  ```
- **On macOS/Linux:**
  ```sh
  npm run build:unix
  ```

This will install dependencies and build all packages and plugins.
