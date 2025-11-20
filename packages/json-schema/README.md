# @nebulus-db/json-schema

JSON Schema utilities for NebulusDB - Convert between Zod schemas and JSON Schema formats.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/json-schema zod
```

## Usage

### Converting Zod Schema to JSON Schema

```typescript
import { z } from 'zod';
import { zodToJSONSchema } from '@nebulus-db/json-schema';

// Define a Zod schema
const userSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150),
  email: z.string().email(),
  tags: z.array(z.string()).optional()
});

// Convert to JSON Schema
const jsonSchema = zodToJSONSchema(userSchema, {
  title: 'User',
  description: 'A user object',
  $id: 'https://example.com/schemas/user.json'
});

console.log(JSON.stringify(jsonSchema, null, 2));
```

### Converting JSON Schema to Zod Schema Code

```typescript
import { jsonSchemaToZod } from '@nebulus-db/json-schema';

const jsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    email: { type: 'string', format: 'email' }
  },
  required: ['name', 'age', 'email']
};

// Generate Zod schema code
const zodCode = jsonSchemaToZod(jsonSchema, 'UserSchema');

console.log(zodCode);
// Output:
// import { z } from 'zod';
//
// export const UserSchema = z.object({
//   name: z.string().min(1).max(100),
//   age: z.number().int().min(0).max(150),
//   email: z.string().email()
// });
//
// export type UserSchema = z.infer<typeof UserSchema>;
```

## API Reference

### `zodToJSONSchema(schema, options?)`

Converts a Zod schema to a JSON Schema object.

**Parameters:**
- `schema`: The Zod schema to convert
- `options`: Optional configuration object
  - `$id`: Schema ID
  - `title`: Schema title
  - `description`: Schema description
  - `includeExamples`: Whether to include examples (default: true)
  - `includeDefaults`: Whether to include default values (default: true)

**Returns:** A JSON Schema object

### `jsonSchemaToZod(schema, name?)`

Converts a JSON Schema to Zod schema code.

**Parameters:**
- `schema`: The JSON Schema object
- `name`: Optional name for the generated schema

**Returns:** TypeScript code string with Zod schema definition

## Supported Conversions

### Zod to JSON Schema
- Primitives: `string`, `number`, `boolean`
- Objects and nested structures
- Arrays and tuples
- Unions (`anyOf`)
- Intersections (`allOf`)
- Enums and literals
- Optional and nullable types
- String validations (min/max length, patterns, formats)
- Number validations (min/max, integer, multipleOf)

### JSON Schema to Zod
- All JSON Schema types
- Object properties and required fields
- Array items and tuple schemas
- Enums and unions
- String and number validations
- Descriptions and defaults

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
