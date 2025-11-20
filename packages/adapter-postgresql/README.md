# @nebulus-db/adapter-postgresql

A PostgreSQL adapter for NebulusDB that provides persistent storage using PostgreSQL's JSONB capabilities for efficient document storage and querying.

## Installation

Install the adapter along with the core NebulusDB package:

```bash
npm install @nebulus-db/core @nebulus-db/adapter-postgresql
```

## Prerequisites

You need access to a PostgreSQL database server (version 9.4 or later for JSONB support).

## Usage

```typescript
import { createDb } from '@nebulus-db/core';
import { PostgresqlAdapter } from '@nebulus-db/adapter-postgresql';

// Create database with PostgreSQL adapter
const db = createDb({
  adapter: new PostgresqlAdapter({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'myuser',
    password: 'mypassword'
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

### `PostgresqlAdapterOptions`

```typescript
interface PostgresqlAdapterOptions extends ClientConfig {
  /** Table name to store documents (default: 'documents') */
  tableName?: string;
}
```

The adapter accepts all standard `pg.ClientConfig` options plus an optional `tableName`.

### Connection Examples

**Individual Parameters:**
```typescript
const adapter = new PostgresqlAdapter({
  host: 'localhost',
  port: 5432,
  database: 'nebulus_db',
  user: 'nebulus_user',
  password: 'secure_password'
});
```

**Connection String:**
```typescript
const adapter = new PostgresqlAdapter({
  connectionString: 'postgresql://user:password@localhost:5432/nebulus_db'
});
```

**With SSL:**
```typescript
const adapter = new PostgresqlAdapter({
  host: 'my-postgres-server.com',
  database: 'nebulus_db',
  user: 'nebulus_user',
  password: 'secure_password',
  ssl: { rejectUnauthorized: false }
});
```

**Custom Table Name:**
```typescript
const adapter = new PostgresqlAdapter({
  database: 'nebulus_db',
  tableName: 'nebulus_documents' // Custom table name
});
```

## API Reference

### Constructor

```typescript
new PostgresqlAdapter(options?: PostgresqlAdapterOptions)
```

Creates a new PostgreSQL adapter instance and automatically initializes the database schema.

**Parameters:**
- `options` (optional): PostgreSQL connection and configuration options.

### Methods

#### `load(): Promise<Record<string, Document[]>>`

Loads all data from the PostgreSQL database.

**Returns:** A record where keys are collection names and values are arrays of documents.

#### `save(data: Record<string, Document[]>): Promise<void>`

Saves NebulusDB data to the PostgreSQL database using transactions for atomicity.

**Parameters:**
- `data`: A record where keys are collection names and values are arrays of documents to save.

#### `close(): Promise<void>`

Closes the database connection.

## Data Model

- **Table Structure:** Documents are stored in a table with columns: `collection` (TEXT), `id` (TEXT), `data` (JSONB).
- **Primary Key:** Composite key on `(collection, id)` ensures uniqueness.
- **JSONB Storage:** Documents are stored as PostgreSQL JSONB for efficient querying and indexing.
- **Persistence:** Data persists across application restarts.
- **Atomicity:** Save operations use transactions to ensure data consistency.

## Database Schema

The adapter automatically creates the table on first use:

```sql
CREATE TABLE documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (collection, id)
);
```

## Error Handling

The adapter includes comprehensive error handling for:
- Connection failures
- Transaction rollbacks
- JSON parsing errors
- Schema creation issues

## Testing

Run tests with:

```bash
npm test
```

**Note:** Tests require a PostgreSQL database connection. Set the `POSTGRES_TEST_CONNECTION_STRING` environment variable:

```bash
export POSTGRES_TEST_CONNECTION_STRING="postgresql://user:password@localhost:5432/test_db"
npm test
```

## License

MIT
