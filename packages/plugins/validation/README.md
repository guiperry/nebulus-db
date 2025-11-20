# @nebulus-db/plugin-validation

Schema validation plugin for NebulusDB using Zod - Validate documents against schemas.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/plugin-validation @nebulus-db/core zod
```

## Usage

### Basic Setup

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';
import { createValidationPlugin } from '@nebulus-db/plugin-validation';
import { z } from 'zod';

// Define a schema
const userSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(0),
  email: z.string().email()
});

// Create validation plugin
const validationPlugin = createValidationPlugin({
  schemas: {
    users: userSchema
  }
});

// Create database with validation
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [validationPlugin]
});

// Valid inserts work
await db.collection('users').insert({
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
});

// Invalid inserts throw errors
try {
  await db.collection('users').insert({
    name: '', // Invalid: empty string
    age: -5,  // Invalid: negative age
    email: 'invalid-email' // Invalid: not an email
  });
} catch (error) {
  console.log('Validation error:', error.message);
}
```

## Configuration Options

### `ValidationPluginOptions`

```typescript
interface ValidationPluginOptions {
  schemas?: Record<string, z.ZodSchema>; // Collection name -> schema mapping
  strict?: boolean;     // Whether to use strict validation (default: false)
  onError?: 'throw' | 'warn' | 'ignore'; // Error handling mode (default: 'throw')
}
```

## Features

- **Zod Integration**: Use powerful Zod schemas for validation
- **Collection-specific**: Define different schemas for different collections
- **Flexible Error Handling**: Choose how to handle validation errors
- **Type Safety**: Full TypeScript integration with Zod

## Validation Modes

- **throw**: Throw an error on validation failure (default)
- **warn**: Log a warning but allow the operation
- **ignore**: Skip validation entirely

## Best Practices

- **Define schemas**: Create Zod schemas for your data models
- **Use strict mode**: Enable strict validation in development
- **Handle errors**: Implement proper error handling in production
- **Validate early**: Catch data issues before they reach the database

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
