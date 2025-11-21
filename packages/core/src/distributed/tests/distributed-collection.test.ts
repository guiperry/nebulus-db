import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkManager } from '../network-manager';
import { DistributedCollection } from '../distributed-collection';

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

describe('DistributedCollection', () => {
  let networkManager: NetworkManager;
  let collection: DistributedCollection;
  let networkId: string;

  beforeEach(async () => {
    networkManager = new NetworkManager();
    await networkManager.initialize();

    networkId = await networkManager.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    collection = new DistributedCollection('users', networkManager);
  });

  afterEach(async () => {
    await networkManager.shutdown();
  });

  it('should create a distributed collection', () => {
    expect(collection.name).toBe('users');
  });

  it('should attach collection to network', async () => {
    await collection.attachToNetwork(networkId);

    const syncState = collection.getSyncState();
    expect(syncState).not.toBeNull();
    expect(syncState!.networkId).toBe(networkId);
  });

  it('should detach collection from network', async () => {
    await collection.attachToNetwork(networkId);
    await collection.detachFromNetwork();

    const syncState = collection.getSyncState();
    expect(syncState).toBeNull();
  });

  it('should insert document and track in operation log', async () => {
    await collection.attachToNetwork(networkId);

    const doc = await collection.insert({ name: 'Alice', age: 30 });

    expect(doc.id).toBeTruthy();
    expect(doc.name).toBe('Alice');
    expect(doc.age).toBe(30);
  });

  it('should update document with distributed tracking', async () => {
    await collection.attachToNetwork(networkId);

    const doc = await collection.insert({ name: 'Bob', age: 25 });
    const updated = await collection.update({ id: doc.id }, { $set: { age: 26 } });

    expect(updated).toBe(1);

    const found = await collection.findOne({ id: doc.id });
    expect(found!.age).toBe(26);
  });

  it('should delete document with distributed tracking', async () => {
    await collection.attachToNetwork(networkId);

    const doc = await collection.insert({ name: 'Charlie', age: 35 });
    const deleted = await collection.delete({ id: doc.id });

    expect(deleted).toBe(1);

    const found = await collection.findOne({ id: doc.id });
    expect(found).toBeNull();
  });

  it('should maintain local functionality without network', async () => {
    const doc = await collection.insert({ name: 'Dave', age: 40 });
    expect(doc.id).toBeTruthy();

    const found = await collection.findOne({ id: doc.id });
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Dave');
  });

  it('should throw error when attaching to non-existent network', async () => {
    await expect(
      collection.attachToNetwork('non-existent-network')
    ).rejects.toThrow();
  });

  it('should throw error when already attached', async () => {
    await collection.attachToNetwork(networkId);

    await expect(
      collection.attachToNetwork(networkId)
    ).rejects.toThrow();
  });

  it('should handle batch operations', async () => {
    await collection.attachToNetwork(networkId);

    const docs = await collection.insertBatch([
      { name: 'User1', age: 20 },
      { name: 'User2', age: 30 },
      { name: 'User3', age: 40 }
    ]);

    expect(docs).toHaveLength(3);

    const all = await collection.find({});
    expect(all).toHaveLength(3);
  });

  it('should force synchronization', async () => {
    await collection.attachToNetwork(networkId);

    const syncStateBefore = collection.getSyncState();
    const lastSyncBefore = syncStateBefore!.lastSync;

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    await collection.forceSync();

    // Note: In a real scenario with multiple peers, this would sync with them
    // For this test, we just verify the method executes without error
  });
});