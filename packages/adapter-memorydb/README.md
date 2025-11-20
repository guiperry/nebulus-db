# @nebulus-db/adapter-memorydb

An Amazon MemoryDB adapter for NebulusDB that provides persistent storage using MemoryDB, a Redis-compatible, durable, in-memory database service.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-memorydb
```

## Prerequisites

You need access to an Amazon MemoryDB cluster. MemoryDB is a Redis-compatible service available in AWS.

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';

// Create database with MemoryDB adapter
const db = createDb({
  adapter: new MemoryAdapter({
    host: 'your-memorydb-cluster-endpoint.cache.amazonaws.com',
    port: 6379,
    password: 'your-password', // if authentication is enabled
    tls: {} // enable TLS for secure connections
  })
});

// Work with collections as usual
const users = db.collection('users');

// Insert documents
await users.insert({ name: 'Alice', age: 30, email: 'alice@example.com' });
await users.insert({ name: 'Bob', age: 25, email: 'bob@example.com' });

// Query documents
const allUsers = await users.find();
console.log(allUsers);
// Output: [
//   { id: '1', name: 'Alice', age: 30, email: 'alice@example.com' },
//   { id: '2', name: 'Bob', age: 25, email: 'bob@example.com' }
// ]

// Find specific documents
const adults = await users.find({ age: { $gte: 18 } });
```

## Configuration

### `MemoryDBOptions`

```typescript
interface MemoryDBOptions {
  /** MemoryDB cluster endpoint host (required) */
  host: string;
  /** MemoryDB cluster endpoint port (required) */
  port: number;
  /** Password for authentication (optional) */
  password?: string;
  /** Username for authentication (optional) */
  username?: string;
  /** TLS options for secure connection (optional) */
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
  };
}
```

### Examples

**Basic Configuration:**
```typescript
const adapter = new MemoryAdapter({
  host: 'my-cluster.cache.amazonaws.com',
  port: 6379
});
```

**With Authentication and TLS:**
```typescript
const adapter = new MemoryAdapter({
  host: 'my-cluster.cache.amazonaws.com',
  port: 6379,
  username: 'myuser',
  password: 'mypassword',
  tls: {} // Enable TLS
});
```

## API Reference

### Constructor

```typescript
new MemoryAdapter(options: MemoryDBOptions)
```

Creates a new MemoryDB adapter instance and establishes a connection.

**Parameters:**
- `options`: Connection configuration for the MemoryDB cluster.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from the MemoryDB cluster.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to the MemoryDB cluster.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the connection to the MemoryDB cluster.

## Data Model

- **Storage:** Uses Redis hashes for each collection, with document IDs as hash fields.
- **Collections:** Maintained in a Redis set called `'collections'`.
- **Documents:** Serialized as JSON strings.
- **Persistence:** Data persists in MemoryDB's durable in-memory storage.
- **Atomicity:** Save operations clear existing data and store new data.

## Error Handling

The adapter includes error handling for:
- Connection failures
- Authentication issues
- JSON parsing errors for corrupted documents
- Network interruptions

## Testing

Run tests with:

```bash
npm test
```

Tests use mocked Redis client to verify functionality without requiring a live MemoryDB cluster.

## License

MIT
