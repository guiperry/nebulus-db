# @nebulus-db/plugin-migration

Schema migration plugin for NebulusDB

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/plugin-migration
```

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';
import { createMigrationPlugin } from '@nebulus-db/plugin-migration';

// Create the plugin
const migrationPlugin = createMigrationPlugin();

// Create a database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [migrationPlugin]
});

// Use the database with the plugin
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });
```

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT

## Schema Versioning Helpers

The migration plugin provides helpers to get and set the current schema version for a collection:

```ts
const version = await plugin.getSchemaVersion('myCollection');
await plugin.setSchemaVersion('myCollection', 2);
```

- `getSchemaVersion(collectionName)` returns the highest applied migration version for the collection (or 0 if none).
- `setSchemaVersion(collectionName, version)` forcibly sets the schema version (e.g., after a manual migration).

### Best Practices
- Always increment the version number for each new migration.
- Use `getSchemaVersion` to check if migrations are needed before applying them.
- Store migration history in a dedicated collection (default: `_migrations`).
