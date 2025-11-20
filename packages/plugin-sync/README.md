# @nebulus-db/plugin-sync

Synchronization plugin for NebulusDB - Enable real-time data synchronization across multiple clients and servers.

Part of the [NebulusDB](https://github.com/Nom-nom-hub/NebulusDB) project - a high-performance, reactive, TypeScript-first, schema-optional, embeddable NoSQL database.

## Installation

```bash
npm install @nebulus-db/plugin-sync @nebulus-db/core
```

## Quick Start

```typescript
import { createDb } from '@nebulus-db/core';
import { MemoryAdapter } from '@nebulus-db/adapter-memorydb';
import { createSyncPlugin } from '@nebulus-db/plugin-sync';

// Create the sync plugin
const syncPlugin = createSyncPlugin({
  serverUrl: 'ws://localhost:3000',
  collections: ['users', 'posts'],
  autoSync: true
});

// Create database with the plugin
const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [syncPlugin]
});

// Work with synced collections
const users = db.collection('users');
await users.insert({ name: 'Alice', age: 30 });

// Changes will be automatically synced to the server
```

## Configuration

### `SyncPluginOptions`

```typescript
interface SyncPluginOptions {
  serverUrl: string;           // Sync server WebSocket URL
  authToken?: string;          // Authentication token
  collections?: string[];      // Collections to sync (default: [])
  syncInterval?: number;       // Sync interval in ms (default: 30000)
  autoSync?: boolean;          // Auto-sync enabled (default: true)
  useWebSockets?: boolean;     // Use WebSockets (default: true)
  conflictResolution?: 'server-wins' | 'client-wins' | 'last-write-wins';
  retry?: {
    maxRetries?: number;
    retryDelay?: number;
    useExponentialBackoff?: boolean;
  };
  logging?: {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}
```

## Features

- **Real-time Sync**: WebSocket-based real-time synchronization
- **Offline Support**: Queue changes when offline, sync when reconnected
- **Conflict Resolution**: Configurable conflict resolution strategies
- **Selective Sync**: Choose which collections to synchronize
- **Authentication**: Token-based authentication support
- **Retry Logic**: Automatic retry with exponential backoff
- **Status Monitoring**: Monitor sync status and connection health

## API

### Plugin API

```typescript
// Get sync status
const status = syncPlugin.api.getStatus();
// { enabled: true, connected: true, lastSyncTime: 1234567890, pendingEvents: 0, error: null }

// Enable/disable sync
syncPlugin.api.enable();
syncPlugin.api.disable();

// Manual sync
const result = await syncPlugin.api.syncNow();
// { success: true, error: null, syncedEvents: 5 }

// Manage collections
syncPlugin.api.addCollection('newCollection');
syncPlugin.api.removeCollection('oldCollection');
const collections = syncPlugin.api.getCollections();

// Clear pending events
const clearedCount = syncPlugin.api.clearPendingEvents();
```

## Usage Examples

### Basic Setup

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'wss://my-sync-server.com',
  collections: ['users', 'products'],
  authToken: 'my-auth-token'
});
```

### Advanced Configuration

```typescript
const syncPlugin = createSyncPlugin({
  serverUrl: 'ws://localhost:3000',
  collections: ['users'],
  syncInterval: 10000, // Sync every 10 seconds
  conflictResolution: 'last-write-wins',
  retry: {
    maxRetries: 10,
    retryDelay: 2000,
    useExponentialBackoff: true
  },
  logging: {
    enabled: true,
    level: 'debug'
  }
});
```

### Monitoring Sync Status

```typescript
// Check sync status periodically
setInterval(() => {
  const status = syncPlugin.api.getStatus();
  console.log('Sync status:', status);
}, 5000);

// Handle sync errors
const status = syncPlugin.api.getStatus();
if (status.error) {
  console.error('Sync error:', status.error);
}
```

## Server Requirements

The sync plugin requires a compatible sync server that supports:

- WebSocket connections
- Authentication via tokens
- Event-based synchronization
- Collection-based data routing

## Documentation

For full documentation, visit the [NebulusDB GitHub repository](https://github.com/Nom-nom-hub/NebulusDB).

## License

MIT
