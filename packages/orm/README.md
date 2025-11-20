# @nebulus-db/orm

ORM-style modeling for NebulusDB - Define database models using TypeScript decorators.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/orm @nebulus-db/core
```

## Quick Start

```typescript
import { Model, Field, Index } from '@nebulus-db/orm';
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';

// Define a model using decorators
@Model({ collection: 'users' })
class User {
  @Field({ required: true })
  @Index()
  name: string;

  @Field({ type: Number, default: 0 })
  age: number;

  @Field()
  email?: string;
}

// Create database
const db = createDb({
  adapter: new MemoryAdapter()
});

// Get model metadata
const userMetadata = User.getModelMetadata();
const userFields = User.getFieldsMetadata();

// Work with collections as usual
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30, email: 'alice@example.com' });
const result = await users.find({ age: { $gt: 20 } });
console.log(result);
```

## Decorators

### `@Model(options?)`

Defines a class as a NebulusDB model.

```typescript
@Model({
  collection: 'custom_collection_name', // Optional, defaults to lowercase class name
  timestamps: true // Optional, adds createdAt/updatedAt fields
})
class MyModel {
  // ...
}
```

### `@Field(options?)`

Defines a field in the model.

```typescript
@Field({
  type: String, // Optional, inferred from TypeScript
  required: true, // Optional, default false
  default: 'default_value', // Optional
  unique: false, // Optional
  validate: (value) => value.length > 0 // Optional validation function
})
name: string;
```

### `@Index(options?)`

Creates an index on a field or combination of fields.

```typescript
// Single field index
@Index()
name: string;

// Compound index on class
@Index({
  name: 'name_age_idx',
  fields: ['name', 'age']
})
class User {
  name: string;
  age: number;
}
```

### `@Relation(options)`

Defines relationships between models.

```typescript
@Relation({
  type: RelationType.ONE_TO_MANY,
  target: () => Post,
  foreignKey: 'authorId',
  inverseSide: 'author'
})
posts: Post[];
```

## Model Metadata

Access model metadata at runtime:

```typescript
// Get model information
const metadata = User.getModelMetadata();
// { collection: 'users', timestamps: true, target: User }

// Get field definitions
const fields = User.getFieldsMetadata();
// { name: { type: String, required: true, name: 'name' }, ... }

// Get indexes
const indexes = User.getIndexesMetadata();
// [{ name: 'name_idx', type: 'single', fields: ['name'] }, ...]

// Get relations
const relations = User.getRelationsMetadata();
// { posts: { type: 'one-to-many', target: Post, ... }, ... }
```

## Supported Relation Types

- `RelationType.ONE_TO_ONE`: One-to-one relationship
- `RelationType.ONE_TO_MANY`: One-to-many relationship
- `RelationType.MANY_TO_ONE`: Many-to-one relationship
- `RelationType.MANY_TO_MANY`: Many-to-many relationship

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
