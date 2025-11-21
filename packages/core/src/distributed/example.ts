import { createDistributedDb } from './distributed-database';
import { InMemoryAdapter } from '../in-memory-adapter';

/**
 * Example usage of NebulusDB Distributed Database
 */
async function example() {
  // Create a distributed database
  const db = createDistributedDb({
    adapter: new InMemoryAdapter(),
    plugins: [],
    distributed: {
      enabled: true,
      networkId: 'my-app-network'
    }
  });

  // Create a network
  const networkId = await db.createNetwork({
    networkId: 'consortium-1',
    name: 'Company Consortium',
    bootstrapPeers: []
  });

  // Create collections
  const users = db.collection('users');
  const orders = db.collection('orders');

  // Attach collections to network
  await db.addCollectionToNetwork(networkId, 'users');
  await db.addCollectionToNetwork(networkId, 'orders');

  // Normal operations work as before
  await users.insert({ name: 'Alice', email: 'alice@example.com' });
  await orders.insert({ userId: 'alice-id', total: 100 });

  // Data syncs automatically across all peers in the network

  // Get network statistics
  const stats = db.getNetworkManager().getNetworkStats(networkId);
  console.log(`Connected peers: ${stats?.connectedPeers}`);

  // Remove collection from network
  await db.removeCollectionFromNetwork('orders');

  // Shutdown
  await db.shutdown();
}

export { example };