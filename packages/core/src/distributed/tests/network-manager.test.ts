import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkManager } from '../network-manager';
import { MessageType } from '../types';

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

describe('NetworkManager', () => {
  let manager1: NetworkManager;
  let manager2: NetworkManager;

  beforeEach(async () => {
    manager1 = new NetworkManager();
    manager2 = new NetworkManager();
  });

  afterEach(async () => {
    await manager1.shutdown();
    await manager2.shutdown();
  });

  it('should initialize network manager', async () => {
    await manager1.initialize();

    const peerId = manager1.getPeerId();
    expect(peerId).toBeTruthy();
    expect(peerId.length).toBeGreaterThan(0);
  });

  it('should create a new network', async () => {
    await manager1.initialize();

    const networkId = await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    expect(networkId).toBe('test-network');

    const networks = manager1.getNetworks();
    expect(networks).toHaveLength(1);
    expect(networks[0].networkId).toBe('test-network');
  });

  it('should add collection to network', async () => {
    await manager1.initialize();
    const networkId = await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    await manager1.addCollectionToNetwork(networkId, 'users');

    const collections = manager1.getNetworkCollections(networkId);
    expect(collections).toContain('users');
  });

  it('should remove collection from network', async () => {
    await manager1.initialize();
    const networkId = await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    await manager1.addCollectionToNetwork(networkId, 'users');
    await manager1.removeCollectionFromNetwork(networkId, 'users');

    const collections = manager1.getNetworkCollections(networkId);
    expect(collections).not.toContain('users');
  });

  it('should leave a network', async () => {
    await manager1.initialize();
    const networkId = await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    await manager1.leaveNetwork(networkId);

    const networks = manager1.getNetworks();
    expect(networks).toHaveLength(0);
  });

  it('should get network statistics', async () => {
    await manager1.initialize();
    const networkId = await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    const stats = manager1.getNetworkStats(networkId);

    expect(stats).not.toBeNull();
    expect(stats!.networkId).toBe(networkId);
    expect(stats!.connectedPeers).toBe(0);
    expect(stats!.operationsSent).toBe(0);
  });

  it('should register and handle message', async () => {
    await manager1.initialize();

    let receivedMessage = false;

    manager1.onMessage(MessageType.HEARTBEAT, async (msg) => {
      receivedMessage = true;
      expect(msg.type).toBe(MessageType.HEARTBEAT);
    });

    // Emit a message event directly for testing
    manager1.emit('message:received', {
      type: MessageType.HEARTBEAT,
      networkId: 'test',
      senderId: 'peer1',
      timestamp: Date.now(),
      payload: {}
    });

    // Wait for async handler
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(receivedMessage).toBe(true);
  });

  it('should emit network created event', async () => {
    await manager1.initialize();

    let eventEmitted = false;

    manager1.once('network:created', (data) => {
      eventEmitted = true;
      expect(data.networkId).toBe('test-network');
    });

    await manager1.createNetwork({
      networkId: 'test-network',
      name: 'Test Network',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    expect(eventEmitted).toBe(true);
  });

  it('should handle multiple networks', async () => {
    await manager1.initialize();

    await manager1.createNetwork({
      networkId: 'network1',
      name: 'Network 1',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    await manager1.createNetwork({
      networkId: 'network2',
      name: 'Network 2',
      bootstrapPeers: [],
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: false }
    });

    const networks = manager1.getNetworks();
    expect(networks).toHaveLength(2);
    expect(networks.map(n => n.networkId)).toContain('network1');
    expect(networks.map(n => n.networkId)).toContain('network2');
  });
});