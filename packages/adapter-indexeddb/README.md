# @nebulus-db/adapter-indexeddb

An IndexedDB adapter for NebulusDB that provides persistent client-side storage in web browsers. This adapter uses the browser's native IndexedDB API for efficient, asynchronous data storage.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-indexeddb
```

## Prerequisites

This adapter is designed for web browser environments where IndexedDB is available. It will throw an error if IndexedDB is not supported.

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { IndexeddbAdapter } from '@nebulus-db/adapter-indexeddb';

// Create database with IndexedDB adapter
const db = createDb({
  adapter: new IndexeddbAdapter()
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

## API Reference

### Constructor

```typescript
new IndexeddbAdapter()
```

Creates a new IndexedDB adapter instance. Throws an error if IndexedDB is not available in the current environment.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from the IndexedDB database.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to the IndexedDB database.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the IndexedDB database connection and cleans up resources.

## Data Model

- **Database:** Uses IndexedDB database named `'NebulusDB'`.
- **Object Store:** Single store named `'documents'` with compound key `['collection', 'id']`.
- **Storage:** Documents are stored with their collection name embedded for efficient grouping.
- **Persistence:** Data persists across browser sessions and page reloads.
- **Atomicity:** Save operations are transactional and replace all existing data.

## Error Handling

The adapter includes error handling for:
- IndexedDB availability checks
- Database connection failures
- Transaction errors
- Storage quota issues

## Testing

Run tests with:

```bash
npm test
```

Tests use `fake-indexeddb` to simulate IndexedDB in Node.js environments.

## Browser Support

This adapter requires a modern browser with IndexedDB support:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## License

MIT