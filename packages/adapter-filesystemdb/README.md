# @nebulus-db/adapter-filesystemdb

A filesystem adapter for NebulusDB that provides persistent storage using JSON files on disk. This adapter uses the `file-system-db` package for efficient, synchronous file operations.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-filesystemdb
```

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { FilesystemAdapter } from '@nebulus-db/adapter-filesystemdb';

// Create database with filesystem adapter
const db = createDb({
  adapter: new FilesystemAdapter({
    path: './data/db.json' // Path to the database file
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

### `FilesystemAdapterOptions`

```typescript
interface FilesystemAdapterOptions {
  /** Path to the database file (required) */
  path: string;
  /** Whether to compact the JSON output (default: true) */
  compact?: boolean;
}
```

### Examples

**Basic Configuration:**
```typescript
const adapter = new FilesystemAdapter({
  path: './my-database.json'
});
```

**Pretty-printed JSON (for development):**
```typescript
const adapter = new FilesystemAdapter({
  path: './data/dev-db.json',
  compact: false // Pretty-print JSON
});
```

## API Reference

### Constructor

```typescript
new FilesystemAdapter(options: FilesystemAdapterOptions)
```

Creates a new filesystem adapter instance.

**Parameters:**
- `options.path` (required): File path where the database will be stored.
- `options.compact` (optional): Whether to minify JSON output. Defaults to `true`.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from the filesystem database file.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to the filesystem database file.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the adapter. For filesystem adapter, this is a no-op as file operations are synchronous.

## Data Model

- **Storage:** All data is stored in a single JSON file specified by the `path` option.
- **Structure:** Data is stored under a single key `'data'` containing the complete `Record<string, Document[]>` structure.
- **Persistence:** Data persists across application restarts.
- **Atomicity:** Save operations replace the entire file contents.

## Error Handling

The adapter includes error handling for:
- File system access issues
- JSON parsing errors (returns empty object on load failure)
- Write permission problems

## Testing

Run tests with:

```bash
npm test
```

Tests use temporary directories and are cleaned up automatically.

## License

MIT