import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DistributedDatabase, createDistributedDb } from '../distributed-database';
import { InMemoryAdapter } from '../../in-memory-adapter';

// Mock libp2p and related modules
vi.mock('libp2p', () => ({
  createLibp2p: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    peerId: { toString: () => 'mock-peer-id' },
    addEventListener: vi.fn(),
    handle: vi.fn(),
    unhandle: vi.fn(),
    dial: vi.fn(),
    dialProtocol: vi.fn(),
    getConnections: vi.fn(() => [])
  }))
}));

vi.mock('@libp2p/tcp', () => ({ tcp: {} }));
vi.mock('@chainsafe/libp2p-noise', () => ({ noise: {} }));
vi.mock('@libp2p/mplex', () => ({ mplex: {} }));
vi.mock('@libp2p/bootstrap', () => ({ bootstrap: {} }));
vi.mock('@libp2p/mdns', () => ({ mdns: {} }));
vi.mock('@libp2p/kad-dht', () => ({ kadDHT: {} }));
vi.mock('@libp2p/interface-peer-id', () => ({ PeerId: {} }));
vi.mock('@multiformats/multiaddr', () => ({
  multiaddr: vi.fn((addr) => addr)
}));
vi.mock('@libp2p/peer-id', () => ({
  peerIdFromString: vi.fn((id) => id)
}));
vi.mock('it-pipe', () => ({ pipe: vi.fn() }));
vi.mock('it-pushable', () => ({ pushable: {} }));

describe('DistributedDatabase', () => {
  let db: DistributedDatabase;

  beforeEach(() => {
    db = createDistributedDb({
      adapter: new InMemoryAdapter(),
      plugins: [],
      distributed: {
        enabled: true,
        networkId: 'test-db-network'
      }
    });
  });

  afterEach(async () => {
    await db.shutdown();
  });

  it('should create a distributed database', () => {
    expect(db).toBeTruthy();
    expect(db.getNetworkManager()).toBeTruthy();
  });

  it('should create a network', async () => {
    const networkId = await db.createNetwork({
      networkId: 'new-network',
      name: 'New Network',
      bootstrapPeers: []
    });

    expect(networkId).toBe('new-network');

    const networks = db.getNetworkManager().getNetworks();
    expect(networks.some(n => n.networkId === 'new-network')).toBe(true);
  });

  it('should create distributed collections', async () => {
    const collection = db.collection('users');
    expect(collection).toBeTruthy();
    expect(collection.name).toBe('users');
  });

  it('should add collection to network', async () => {
    const networkId = await db.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: []
    });

    const collection = db.collection('users');
    await db.addCollectionToNetwork(networkId, 'users');

    const collections = db.getNetworkManager().getNetworkCollections(networkId);
    expect(collections).toContain('users');
  });

  it('should remove collection from network', async () => {
    const networkId = await db.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: []
    });

    const collection = db.collection('users');
    await db.addCollectionToNetwork(networkId, 'users');
    await db.removeCollectionFromNetwork('users');

    const collections = db.getNetworkManager().getNetworkCollections(networkId);
    expect(collections).not.toContain('users');
  });

  it('should handle multiple collections in different networks', async () => {
    const network1 = await db.createNetwork({
      networkId: 'network1',
      name: 'Network 1',
      bootstrapPeers: []
    });

    const network2 = await db.createNetwork({
      networkId: 'network2',
      name: 'Network 2',
      bootstrapPeers: []
    });

    const users = db.collection('users');
    const posts = db.collection('posts');

    await db.addCollectionToNetwork(network1, 'users');
    await db.addCollectionToNetwork(network2, 'posts');

    const net1Collections = db.getNetworkManager().getNetworkCollections(network1);
    const net2Collections = db.getNetworkManager().getNetworkCollections(network2);

    expect(net1Collections).toContain('users');
    expect(net1Collections).not.toContain('posts');
    expect(net2Collections).toContain('posts');
    expect(net2Collections).not.toContain('users');
  });

  it('should work without distributed mode', () => {
    const localDb = createDistributedDb({
      adapter: new InMemoryAdapter(),
      plugins: [],
      distributed: {
        enabled: false
      }
    });

    const collection = localDb.collection('users');
    expect(collection).toBeTruthy();
  });

  it('should join existing network', async () => {
    const bootstrapPeers = ['/ip4/127.0.0.1/tcp/4001/p2p/QmExamplePeer'];

    // This will attempt to join but won't connect in test environment
    // We just verify the method executes without error
    await db.joinNetwork('external-network', bootstrapPeers);

    const networks = db.getNetworkManager().getNetworks();
    expect(networks.some(n => n.networkId === 'external-network')).toBe(true);
  });

  it('should leave a network', async () => {
    const networkId = await db.createNetwork({
      networkId: 'temp-network',
      name: 'Temp Network',
      bootstrapPeers: []
    });

    await db.leaveNetwork(networkId);

    const networks = db.getNetworkManager().getNetworks();
    expect(networks.some(n => n.networkId === networkId)).toBe(false);
  });

  it('should throw error when adding non-existent collection to network', async () => {
    const networkId = await db.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: []
    });

    await expect(
      db.addCollectionToNetwork(networkId, 'non-existent')
    ).rejects.toThrow();
  });

  it('should maintain data integrity across operations', async () => {
    const collection = db.collection('users');

    await collection.insert({ name: 'Alice', age: 30 });
    await collection.insert({ name: 'Bob', age: 25 });

    const all = await collection.find({});
    expect(all).toHaveLength(2);

    await collection.update({ name: 'Alice' }, { $set: { age: 31 } });

    const alice = await collection.findOne({ name: 'Alice' });
    expect(alice!.age).toBe(31);

    await collection.delete({ name: 'Bob' });

    const remaining = await collection.find({});
    expect(remaining).toHaveLength(1);
  });
});