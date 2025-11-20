# @nebulus-db/plugin-cache

Query caching plugin for NebulusDB - Improve performance by caching query results.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/plugin-cache @nebulus-db/core
```

## Usage

### Basic Setup

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';
import { createCachePlugin } from '@nebulus-db/plugin-cache';

// Create the cache plugin
const cachePlugin = createCachePlugin();

// Create database with caching
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [cachePlugin]
});

// Queries will now be cached
const users = db.collection('users');
const result1 = await users.find({ age: { $gt: 20 } }); // Cache miss
const result2 = await users.find({ age: { $gt: 20 } }); // Cache hit
```

### Advanced Configuration

```typescript
const cachePlugin = createCachePlugin({
  maxCacheSize: 200,        // Max cached queries per collection
  ttl: 300000,             // 5 minutes TTL
  excludeCollections: ['logs'], // Don't cache these collections
  cacheEmptyResults: false  // Don't cache empty query results
});
```

## Configuration Options

### `CachePluginOptions`

```typescript
interface CachePluginOptions {
  maxCacheSize?: number;      // Maximum cached queries per collection (default: 100)
  ttl?: number;               // Time-to-live in ms (default: 60000)
  excludeCollections?: string[]; // Collections to exclude from caching
  cacheEmptyResults?: boolean;   // Whether to cache empty results (default: true)
}
```

## How It Works

- **Automatic Caching**: Query results are automatically cached on first execution
- **Cache Invalidation**: Cache is cleared when data is modified (insert/update/delete)
- **LRU Eviction**: Least recently used entries are evicted when cache size limit is reached
- **TTL Expiration**: Cached entries expire after the specified time-to-live
- **Query Hashing**: Queries are hashed for efficient cache lookup

## Performance Benefits

- **Faster Queries**: Repeated queries return cached results instantly
- **Reduced I/O**: Less database access for frequently queried data
- **Configurable**: Fine-tune caching behavior for your use case

## Best Practices

- **Set appropriate TTL**: Balance performance vs data freshness
- **Exclude volatile collections**: Don't cache collections that change frequently
- **Monitor cache hit rates**: Adjust `maxCacheSize` based on usage patterns
- **Consider memory usage**: Large result sets consume more memory

## Cache Invalidation

The cache automatically invalidates when:

- Documents are inserted into a collection
- Documents are updated in a collection
- Documents are deleted from a collection

This ensures data consistency while providing performance benefits for read-heavy workloads.

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
