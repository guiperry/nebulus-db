# @nebulus-db/core

Core package for NebulusDB

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/core
```

## Quick Start

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';

// Create a database with in-memory adapter
const db = createDb({
  adapter: new MemoryAdapter()
});

// Create a collection
const users = db.collection('users');

// Insert a document
await users.insert({ name: 'Alice', age: 30 });

// Query documents
const result = await users.find({ age: { $gt: 20 } });
console.log(result);
```

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
