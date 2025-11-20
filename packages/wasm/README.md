# @nebulus-db/wasm

WebAssembly support for NebulusDB - High-performance WASM-optimized database operations.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/wasm @nebulus-db/core
```

## Prerequisites

Before using the WASM package, you need to build the WASM module:

```bash
cd packages/wasm
npm run build:wasm
```

This creates the WASM binaries in `packages/wasm/wasm/pkg/`.

## Usage

### Basic Setup

```typescript
import { initWasm, WasmAdapter, WasmDatabase } from '@nebulus-db/wasm';

// Initialize WASM module
await initWasm();

// Create WASM database
const db = new WasmDatabase();

// Work with collections
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
const result = await users.find({ age: { $gt: 20 } });
console.log(result);
```

### Using with Core NebulusDB

```typescript
import { createDb } from '@nebulus-db/core';
import { initWasm, WasmAdapter } from '@nebulus-db/wasm';

// Initialize WASM
await initWasm();

// Create database with WASM adapter
const db = createDb({
  adapter: new WasmAdapter()
});

// Use as normal
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## API Reference

### `initWasm()`

Initializes the WASM module. Must be called before creating WASM adapters or databases.

```typescript
await initWasm();
```

### `WasmAdapter`

A NebulusDB adapter that uses WASM for storage operations.

```typescript
const adapter = new WasmAdapter();
```

### `WasmDatabase`

A WASM-optimized database implementation.

```typescript
const db = new WasmDatabase();
```

### `WasmCollection`

A WASM-optimized collection with all standard NebulusDB operations.

```typescript
const collection = db.collection('users');

// CRUD operations
await collection.insert({ name: 'Alice' });
const docs = await collection.find({ name: 'Alice' });
await collection.update({ name: 'Alice' }, { $set: { age: 30 } });
await collection.delete({ name: 'Alice' });

// Indexing
await collection.createIndex({
  name: 'name_idx',
  fields: ['name'],
  type: 'single'
});
```

## Performance Benefits

The WASM implementation provides:

- **Faster queries**: Optimized algorithms in Rust/WebAssembly
- **Lower memory usage**: Efficient data structures
- **Better concurrency**: WASM's isolated execution model
- **Cross-platform**: Same performance in browsers and Node.js

## Building WASM Module

To build the WASM module from source:

```bash
cd packages/wasm/wasm
wasm-pack build --target web --out-dir pkg
wasm-pack build --target nodejs --out-dir pkg_node
```

## Browser vs Node.js

The package automatically detects the environment and loads the appropriate WASM module:

- **Browser**: Uses `nebulus_wasm.js` (WebAssembly)
- **Node.js**: Uses `nebulus_wasm_node.js` (native bindings)

## Limitations

- Requires WASM module to be built and available
- Some advanced features may not be fully implemented in WASM yet
- Subscription/reactivity is simplified in the current implementation

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
