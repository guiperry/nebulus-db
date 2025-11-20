# @nebulus-db/adapter-chromadb

A ChromaDB adapter for NebulusDB that enables persistent storage using ChromaDB as a document database. This adapter leverages ChromaDB's collection-based storage without utilizing its vector search capabilities.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-chromadb
```

## Prerequisites

### Running ChromaDB Server

For production use, you need a running ChromaDB server. Start one using Docker:

```bash
docker run -p 8000:8000 chromadb/chroma
```

Or install and run ChromaDB locally:

```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### In-Memory Mode

For testing or development without a server, use the `inMemory` option (see Configuration below).

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { ChromadbAdapter } from '@nebulus-db/adapter-chromadb';

// Create database with ChromaDB adapter
const db = createDb({
  adapter: new ChromadbAdapter({
    url: 'http://localhost:8000' // Optional, defaults to localhost:8000
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

### `ChromadbAdapterOptions`

```typescript
interface ChromadbAdapterOptions {
  /** ChromaDB server URL (default: 'http://localhost:8000') */
  url?: string;
  /** Use in-memory ChromaDB for testing (default: false) */
  inMemory?: boolean;
}
```

### Examples

**Custom Server URL:**
```typescript
const adapter = new ChromadbAdapter({
  url: 'http://my-chromadb-server:8000'
});
```

**In-Memory Mode (for testing):**
```typescript
const adapter = new ChromadbAdapter({
  inMemory: true
});
```

## API Reference

### Constructor

```typescript
new ChromadbAdapter(options?: ChromadbAdapterOptions)
```

Creates a new ChromaDB adapter instance.

**Parameters:**
- `options.url` (optional): The URL of the ChromaDB server. Defaults to `'http://localhost:8000'`.
- `options.inMemory` (optional): Whether to use in-memory mode for testing. Defaults to `false`.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from ChromaDB collections and returns it in NebulusDB format.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to ChromaDB collections. Creates collections as needed and replaces existing data.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the adapter connection. For ChromaDB, this is a no-op as the client handles connection management automatically.

## Data Model

- **Collections:** Each NebulusDB collection maps to a ChromaDB collection.
- **Documents:** Stored as JSON strings in ChromaDB. Document IDs are preserved.
- **Persistence:** Data is persisted across application restarts when using a ChromaDB server.
- **Atomicity:** Save operations replace entire collections (not individual documents).

## Error Handling

The adapter includes comprehensive error handling:
- Connection failures are logged and re-thrown
- JSON parsing errors for corrupted documents are handled gracefully
- Collection creation errors are managed automatically

## Testing

Run tests with:

```bash
npm test
```

**Note:** Tests will be skipped if no ChromaDB server is running on `http://localhost:8000`, unless using `inMemory: true` in the adapter options. For full test coverage, ensure a ChromaDB server is available.

## License

MIT
