# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NebulusDB is a high-performance, reactive, TypeScript-first embedded NoSQL database that runs in browsers, Node.js, and Edge environments. It features advanced indexing (B-tree), optimized query processing with caching, modular adapters for persistence, reactive live queries using @preact/signals-core, and a comprehensive plugin system.

## Build & Development Commands

### Building the Project

**Platform-specific builds:**
```bash
npm run build:unix    # macOS/Linux
npm run build:win     # Windows
npm run build         # Auto-detects platform
```

The build process (via `scripts/build.sh` or `scripts/build.bat`):
1. Installs root dependencies
2. Builds `packages/core` first (required by all other packages)
3. Builds all adapters in `packages/adapter-*/`
4. Builds plugins: validation, encryption, versioning
5. Installs test dependencies

**Individual package builds:**
```bash
cd packages/core && npm install && npm run build
cd packages/adapter-memorydb && npm install && npm run build
```

### Testing

```bash
npm test                 # Run all tests with Vitest
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
npm run test:basic       # Run basic smoke tests
```

Test files are located in:
- `packages/*/tests/**/*.test.ts`
- `packages/*/src/**/*.test.ts`
- `tests/` (integration tests)

### Linting & Formatting

```bash
npm run lint             # Check for lint errors
npm run lint -- --fix    # Auto-fix lint issues
npm run format           # Format with Prettier
```

### Benchmarking

```bash
npm run benchmark        # Run performance benchmarks
```

## Architecture

### Monorepo Structure

This is a **workspace-based monorepo** with packages organized as:
```
packages/
├── core/                   # Core database engine
├── adapter-*/              # Storage adapters
│   ├── adapter-memorydb
│   ├── adapter-indexeddb
│   ├── adapter-filesystemdb
│   ├── adapter-sqlite
│   ├── adapter-postgresql
│   └── adapter-chromadb
├── plugins/                # Plugin packages
│   ├── validation/
│   ├── encryption/
│   └── versioning/
├── nebulus-db/              # Simple wrapper package
├── cli/                    # CLI tool
├── orm/                    # ORM layer
├── wasm/                   # WebAssembly bindings
└── devtools/               # Development tools
```

**Important:** Always build `packages/core` first, as all adapters and plugins depend on it.

### Core Architecture

#### Database Layer (`packages/core/src/db.ts`)
- `Database` class manages collections via `Map<string, ICollection>`
- `Adapter` interface handles data persistence (load/save)
- Plugin system with lifecycle hooks (onInit, onBeforeInsert, onAfterQuery, etc.)

#### Collection Layer (`packages/core/src/collection.ts`)
The `Collection` class is the heart of NebulusDB:
- **Reactive State:** Uses `@preact/signals-core` for reactive queries and subscriptions
- **Indexing:** `EnhancedIndexManager` with B-tree support (single, compound, unique, text, multi)
- **Query Optimization:** `QueryCache` with TTL, `optimized-query.ts` handles short-circuit evaluation
- **Concurrency:** `ReadWriteLock` + `TaskQueue` + optional `AdaptiveConcurrencyControl`
- **Compression:** `DocumentCompression` for large documents (configurable threshold)
- **Memory Management:** `MemoryManager` for chunked processing and memory optimization

#### Key Components

**Indexing (`enhanced-indexing.ts`):**
- B-tree implementation for range queries
- Automatic index selection based on query patterns
- Supports single-field, compound, unique, text, and multi-value indexes

**Query Processing (`optimized-query.ts`):**
- `matchDocument()`: Evaluates queries against documents
- `applyUpdate()`: Applies update operations ($set, $unset, $inc, $push, $pull)
- Supports operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists
- Logical operators: $and, $or, $not

**Concurrency (`concurrency.ts`, `adaptive-concurrency.ts`):**
- `ReadWriteLock`: Ensures safe concurrent access
- `TaskQueue`: Manages parallel batch operations
- `AdaptiveConcurrencyControl`: Dynamically adjusts concurrency based on workload

**Plugin System (`types.ts`):**
Plugins can hook into:
- Database lifecycle: `onInit`
- Collection lifecycle: `onCollectionCreate`
- CRUD operations: `onBeforeInsert`, `onAfterInsert`, `onBeforeUpdate`, `onAfterUpdate`, etc.
- Queries: `onBeforeQuery`, `onAfterQuery`

### Adapters

All adapters implement the `Adapter` interface:
```typescript
interface Adapter {
  load(): Promise<Record<string, Document[]>>;
  save(data: Record<string, Document[]>): Promise<void>;
}
```

**Available adapters:**
- `InMemoryAdapter` - No persistence (default)
- `LocalstorageAdapter` - Browser localStorage
- `IndexedDB` - Browser IndexedDB (via `adapter-indexeddb`)
- `FileSystemDB` - Node.js file system (via `adapter-filesystemdb`)
- `SQLite` - SQLite backend (via `adapter-sqlite`)
- `PostgreSQL` - PostgreSQL backend (via `adapter-postgresql`)
- `ChromaDB` - Vector database integration (via `adapter-chromadb`)

### Environment-Specific Code

The core package detects runtime environment:
```typescript
// packages/core/src/index.ts
export const isNode = typeof process !== 'undefined' && process.versions?.node != null;
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
export const isSSR = isNode && typeof window === 'undefined';
```

Uses dynamic imports to load environment-specific adapters:
- Browser → `browser-adapter.ts` (IndexedDB/WebSQL)
- Node.js → `node-adapter.ts` (better-sqlite3)

## Important Implementation Details

### Document Structure

All documents must have an `id` field (string or number). Documents can optionally implement `toJSON()` for serialization.

### Reactive Queries

Collections use `@preact/signals-core` for reactivity:
- Changes to documents trigger signal updates
- Subscriptions re-evaluate when signal updates
- Batch operations defer signal updates until `endBatch()`

### Performance Optimizations

**Query Cache:**
- Enabled by default with 100-entry LRU cache and 30s TTL
- Invalidated automatically on writes
- Configure via `CollectionOptions.queryCache`

**Batch Operations:**
```typescript
collection.beginBatch();
await collection.insertBatch(docs);    // More efficient than individual inserts
await collection.updateBatch(queries, updates);
collection.endBatch();
```

**Memory Management:**
```typescript
// Process large datasets in chunks
await collection.processInChunks(async (docs) => {
  return docs.map(doc => ({ ...doc, processed: true }));
}, 1000); // chunk size

// Optimize memory usage
collection.optimize();
```

**Document Compression:**
- Configure threshold (bytes) for automatic compression
- Use `recompressAll()` to recompress existing documents

### Node.js Version Requirements

- **Required:** Node.js 18.0.0 or higher
- Pre-hooks check version via `scripts/check-node-version.js`
- Can bypass with `Nebulus_SKIP_VERSION_CHECK=1` (development only)

### TypeScript Configuration

- Target: ES2020
- Module: ES2020 with bundler resolution
- Strict mode enabled
- Uses path aliases in vitest.config.ts for package imports

## Testing Patterns

Tests use Vitest with these patterns:
- Test files in `packages/*/tests/` or alongside source files
- Coverage excludes `node_modules/`, `dist/`, test files, and `.d.ts` files
- Integration tests in `tests/integration/`
- Benchmark tests in `tests/benchmark/` and `benchmarks/`
- Memory tests in `tests/memory/`

## Common Gotchas

1. **Always build core first** - Other packages depend on `@nebulus-db/core`
2. **Document compression** - Check if document is compressed before accessing: `compression.isCompressed(doc)`
3. **Batch operations** - Always call `beginBatch()` before and `endBatch()` after batch operations
4. **Index types** - Use `IndexType` enum, not string literals
5. **Plugin hooks** - Async hooks must return Promises; sync hooks should not
6. **Reactive subscriptions** - Unsubscribe when no longer needed to prevent memory leaks
7. **Adapter serialization** - Ensure documents are properly serialized (handle toJSON) when saving

## Package Publishing

Packages are scoped under `@nebulus-db/`:
- Core: `@nebulus-db/core`
- Main wrapper: `@nebulus-db/nebulus-db`
- Adapters: `@nebulus-db/adapter-{name}`
- Plugins: `@nebulus-db/plugin-{name}`

Scripts for package management:
- `scripts/update-versions.js` - Update all package versions
- `scripts/align-versions.js` - Align dependency versions
- `scripts/generate-package-readmes.js` - Generate package README files
