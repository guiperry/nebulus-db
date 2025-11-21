import { createLibp2p, Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { bootstrap } from '@libp2p/bootstrap';
import { mdns } from '@libp2p/mdns';
import { kadDHT } from '@libp2p/kad-dht';
import type { PeerId } from '@libp2p/interface-peer-id';
import type { Multiaddr } from '@multiformats/multiaddr';
import { pipe } from 'it-pipe';
import { pushable } from 'it-pushable';
import {
  NetworkConfig,
  PeerInfo,
  NetworkStats,
  ProtocolMessage,
  MessageType
} from './types';
import { EventEmitter } from 'events';

export class NetworkManager extends EventEmitter {
  private networks: Map<string, NetworkConfig> = new Map();
  private node: Libp2p | null = null;
  private peers: Map<string, PeerInfo> = new Map();
  private stats: Map<string, NetworkStats> = new Map();
  private messageHandlers: Map<MessageType, ((msg: ProtocolMessage) => Promise<void>)[]> = new Map();
  private initialized = false;
  private peerId: string = '';

  constructor() {
    super();
  }

  /**
   * Initialize the P2P node
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      transports: [tcp()],
      connectionEncryption: [noise()],
      streamMuxers: [mplex() as any],
      peerDiscovery: [
        mdns({
          interval: 1000
        })
      ],
      services: {
        dht: kadDHT({
          clientMode: false
        }) as any
      }
    });

    await this.node.start();
    this.peerId = this.node.peerId.toString();
    this.initialized = true;

    // Set up connection handlers
    this.node.addEventListener('peer:discovery', (evt: any) => {
      this.handlePeerDiscovery(evt.detail);
    });

    this.node.addEventListener('peer:connect', (evt: any) => {
      this.handlePeerConnect(evt.detail);
    });

    this.node.addEventListener('peer:disconnect', (evt: any) => {
      this.handlePeerDisconnect(evt.detail);
    });

    this.emit('initialized', { peerId: this.peerId });
  }

  /**
   * Create a new network
   */
  async createNetwork(config: Omit<NetworkConfig, 'collections'>): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    const networkId = config.networkId;

    const networkConfig: NetworkConfig = {
      ...config,
      collections: new Set()
    };

    this.networks.set(networkId, networkConfig);

    // Initialize stats
    this.stats.set(networkId, {
      networkId,
      connectedPeers: 0,
      totalPeers: 0,
      collectionsShared: 0,
      operationsSent: 0,
      operationsReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0
    });

    // Register protocol handler for this network
    const protocolId = `/nebulusdb/${networkId}/1.0.0`;
    await this.node!.handle(protocolId, async ({ stream }) => {
      await this.handleIncomingStream(stream, networkId);
    });

    this.emit('network:created', { networkId });
    return networkId;
  }

  /**
   * Join an existing network
   */
  async joinNetwork(networkId: string, bootstrapPeers: string[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config: NetworkConfig = {
      networkId,
      name: `Network ${networkId}`,
      collections: new Set(),
      bootstrapPeers: bootstrapPeers.map(addr => {
        const { multiaddr } = require('@multiformats/multiaddr');
        return multiaddr(addr) as Multiaddr;
      }),
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: true }
    };

    this.networks.set(networkId, config);

    // Connect to bootstrap peers
    for (const addr of config.bootstrapPeers) {
      try {
        await this.node!.dial(addr as any);
      } catch (err) {
        console.warn(`Failed to connect to bootstrap peer ${addr}:`, err);
      }
    }

    this.emit('network:joined', { networkId });
  }

  /**
   * Leave a network
   */
  async leaveNetwork(networkId: string): Promise<void> {
    const network = this.networks.get(networkId);
    if (!network) return;

    // Unregister protocol handler
    const protocolId = `/nebulusdb/${networkId}/1.0.0`;
    this.node!.unhandle(protocolId);

    // Clear collections
    network.collections.clear();

    // Remove network
    this.networks.delete(networkId);
    this.stats.delete(networkId);

    this.emit('network:left', { networkId });
  }

  /**
   * Add a collection to a network
   */
  async addCollectionToNetwork(networkId: string, collectionName: string): Promise<void> {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network ${networkId} not found`);
    }

    network.collections.add(collectionName);

    const stats = this.stats.get(networkId)!;
    stats.collectionsShared = network.collections.size;

    // Announce collection to peers
    await this.broadcastMessage(networkId, {
      type: MessageType.COLLECTION_ANNOUNCE,
      networkId,
      senderId: this.peerId,
      timestamp: Date.now(),
      payload: { collection: collectionName }
    });

    this.emit('collection:added', { networkId, collectionName });
  }

  /**
   * Remove a collection from a network
   */
  async removeCollectionFromNetwork(networkId: string, collectionName: string): Promise<void> {
    const network = this.networks.get(networkId);
    if (!network) return;

    network.collections.delete(collectionName);

    const stats = this.stats.get(networkId)!;
    stats.collectionsShared = network.collections.size;

    this.emit('collection:removed', { networkId, collectionName });
  }

  /**
   * Get collections in a network
   */
  getNetworkCollections(networkId: string): string[] {
    const network = this.networks.get(networkId);
    return network ? Array.from(network.collections) : [];
  }

  /**
   * Send a message to all peers in a network
   */
  async broadcastMessage(networkId: string, message: ProtocolMessage): Promise<void> {
    const network = this.networks.get(networkId);
    if (!network) return;

    const protocolId = `/nebulusdb/${networkId}/1.0.0`;
    const connections = this.node!.getConnections();

    const stats = this.stats.get(networkId)!;

    for (const connection of connections) {
      try {
        const stream = await connection.newStream(protocolId);
        const messageBytes = Buffer.from(JSON.stringify(message));

        await pipe(
          [messageBytes],
          stream
        );

        stats.operationsSent++;
        stats.bytesTransferred += messageBytes.length;
      } catch (err) {
        console.warn(`Failed to send message to peer ${connection.remotePeer}:`, err);
      }
    }
  }

  /**
   * Send a message to a specific peer
   */
  async sendToPeer(peerId: string, networkId: string, message: ProtocolMessage): Promise<void> {
    const protocolId = `/nebulusdb/${networkId}/1.0.0`;
    const { peerIdFromString } = await import('@libp2p/peer-id');
    const targetPeerId = peerIdFromString(peerId);

    try {
      const stream = await this.node!.dialProtocol(targetPeerId as any, protocolId);
      const messageBytes = Buffer.from(JSON.stringify(message));

      await pipe(
        [messageBytes],
        stream
      );

      const stats = this.stats.get(networkId)!;
      stats.operationsSent++;
      stats.bytesTransferred += messageBytes.length;
    } catch (err) {
      console.error(`Failed to send message to peer ${peerId}:`, err);
      throw err;
    }
  }

  /**
   * Register a message handler
   */
  onMessage(type: MessageType, handler: (msg: ProtocolMessage) => Promise<void>): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Get network statistics
   */
  getNetworkStats(networkId: string): NetworkStats | null {
    return this.stats.get(networkId) || null;
  }

  /**
   * Get all networks
   */
  getNetworks(): NetworkConfig[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get peer ID
   */
  getPeerId(): string {
    return this.peerId;
  }

  /**
   * Shutdown the network manager
   */
  async shutdown(): Promise<void> {
    if (this.node) {
      await this.node.stop();
      this.initialized = false;
    }

    this.networks.clear();
    this.peers.clear();
    this.stats.clear();
    this.messageHandlers.clear();
  }

  // Private methods

  private async handleIncomingStream(stream: any, networkId: string): Promise<void> {
    const stats = this.stats.get(networkId)!;

    try {
      await pipe(
        stream,
        async (source: any) => {
          for await (const msg of source) {
            const message: ProtocolMessage = JSON.parse(msg.toString());
            stats.operationsReceived++;
            stats.bytesTransferred += msg.length;

            await this.handleMessage(message);
          }
        }
      );
    } catch (err) {
      console.error('Error handling incoming stream:', err);
    }
  }

  private async handleMessage(message: ProtocolMessage): Promise<void> {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (err) {
          console.error(`Error in message handler for type ${message.type}:`, err);
        }
      }
    }

    this.emit('message:received', message);
  }

  private handlePeerDiscovery(peerId: PeerId): void {
    const peerIdStr = peerId.toString();

    if (!this.peers.has(peerIdStr)) {
      this.peers.set(peerIdStr, {
        peerId: peerIdStr,
        addresses: [],
        protocols: [],
        lastSeen: Date.now(),
        collections: []
      });
    }

    this.emit('peer:discovered', { peerId: peerIdStr });
  }

  private handlePeerConnect(peerId: PeerId): void {
    const peerIdStr = peerId.toString();

    const peerInfo = this.peers.get(peerIdStr);
    if (peerInfo) {
      peerInfo.lastSeen = Date.now();
    }

    // Update stats for all networks
    for (const [networkId, stats] of Array.from(this.stats.entries())) {
      stats.connectedPeers = this.node!.getConnections().length;
      stats.totalPeers = this.peers.size;
    }

    this.emit('peer:connected', { peerId: peerIdStr });
  }

  private handlePeerDisconnect(peerId: PeerId): void {
    const peerIdStr = peerId.toString();

    // Update stats for all networks
    for (const [networkId, stats] of Array.from(this.stats.entries())) {
      stats.connectedPeers = this.node!.getConnections().length;
    }

    this.emit('peer:disconnected', { peerId: peerIdStr });
  }
}