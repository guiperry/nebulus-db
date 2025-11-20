# @nebulus-db/adapter-sqlite

An SQLite adapter for NebulusDB that provides persistent file-based storage using SQLite's embedded database capabilities.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-sqlite
```

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { SqliteAdapter } from '@nebulus-db/adapter-sqlite';

// Create database with SQLite adapter
const db = createDb({
  adapter: new SqliteAdapter({
    filename: './data/my-database.db'
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

### `SqliteAdapterOptions`

```typescript
interface SqliteAdapterOptions {
  /** Path to the SQLite database file (required) */
  filename: string;
  /** SQLite open mode (optional, default: OPEN_READWRITE | OPEN_CREATE) */
  mode?: number;
}
```

### Examples

**Basic Configuration:**
```typescript
const adapter = new SqliteAdapter({
  filename: './data/app.db'
});
```

**In-Memory Database (for testing):**
```typescript
const adapter = new SqliteAdapter({
  filename: ':memory:'
});
```

**Read-Only Mode:**
```typescript
import * as sqlite3 from 'sqlite3';

const adapter = new SqliteAdapter({
  filename: './data/app.db',
  mode: sqlite3.OPEN_READONLY
});
```

## API Reference

### Constructor

```typescript
new SqliteAdapter(options: SqliteAdapterOptions)
```

Creates a new SQLite adapter instance and automatically initializes the database schema.

**Parameters:**
- `options.filename`: Path to the SQLite database file.
- `options.mode` (optional): SQLite open mode flags.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from the SQLite database.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to the SQLite database using transactions for atomicity.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the database connection.

## Data Model

- **Table Structure:** Documents are stored in a `documents` table with columns: `collection` (TEXT), `id` (TEXT), `data` (TEXT).
- **Primary Key:** Composite key on `(collection, id)` ensures uniqueness.
- **JSON Storage:** Documents are stored as JSON strings.
- **Persistence:** Data persists in the SQLite file across application restarts.
- **Atomicity:** Save operations use transactions to ensure data consistency.

## Database Schema

The adapter automatically creates the table on first use:

```sql
CREATE TABLE documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
```

## Error Handling

The adapter includes error handling for:
- Database connection failures
- Transaction rollbacks
- JSON parsing errors
- File system issues

## Testing

Run tests with:

```bash
npm test
```

Tests create temporary database files and clean them up automatically.

## License

MIT