# @nebulus-db/plugin-logger

Logging plugin for NebulusDB

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/plugin-logger
```

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';
import { createLoggerPlugin } from '@nebulus-db/plugin-logger';

// Create the plugin
const loggerPlugin = createLoggerPlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [loggerPlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
