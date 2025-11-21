import { Database } from '../db';
import { DbOptions, CollectionOptions, ICollection } from '../types';
import { NetworkManager } from './network-manager';
import { DistributedCollection } from './distributed-collection';

export interface DistributedDbOptions extends DbOptions {
  distributed: {
    enabled: boolean;
    networkId?: string;
    bootstrapPeers?: string[];
  };
}

export class DistributedDatabase extends Database {
  private networkManager: NetworkManager;
  private distributedEnabled: boolean;

  constructor(options: DistributedDbOptions) {
    super(options);

    this.distributedEnabled = options.distributed.enabled;
    this.networkManager = new NetworkManager();

    if (this.distributedEnabled) {
      this.initializeDistributed(options.distributed);
    }
  }

  /**
   * Create or get a collection with distributed support
   */
  collection(name: string, options: CollectionOptions = {}): ICollection {
    if (this.collections.has(name)) {
      return this.collections.get(name)!;
    }

    let collection: ICollection;

    if (this.distributedEnabled) {
      collection = new DistributedCollection(
        name,
        this.networkManager,
        [],
        options,
        this.plugins
      );
    } else {
      collection = super.collection(name, options);
    }

    this.collections.set(name, collection);
    return collection;
  }

  /**
   * Create a new network
   */
  async createNetwork(config: {
    networkId: string;
    name: string;
    bootstrapPeers?: string[];
  }): Promise<string> {
    const { multiaddr } = await import('@multiformats/multiaddr');

    return await this.networkManager.createNetwork({
      networkId: config.networkId,
      name: config.name,
      bootstrapPeers: (config.bootstrapPeers || []).map(addr => multiaddr(addr)),
      encryption: { enabled: true },
      replication: { factor: 3, strategy: 'full' },
      discovery: { mdns: true, bootstrap: true }
    });
  }

  /**
   * Join an existing network
   */
  async joinNetwork(networkId: string, bootstrapPeers: string[]): Promise<void> {
    await this.networkManager.joinNetwork(networkId, bootstrapPeers);
  }

  /**
   * Leave a network
   */
  async leaveNetwork(networkId: string): Promise<void> {
    await this.networkManager.leaveNetwork(networkId);
  }

  /**
   * Add a collection to a network
   */
  async addCollectionToNetwork(networkId: string, collectionName: string): Promise<void> {
    const collection = this.collections.get(collectionName);

    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    if (collection instanceof DistributedCollection) {
      await collection.attachToNetwork(networkId);
    } else {
      throw new Error(`Collection ${collectionName} is not a distributed collection`);
    }
  }

  /**
   * Remove a collection from a network
   */
  async removeCollectionFromNetwork(collectionName: string): Promise<void> {
    const collection = this.collections.get(collectionName);

    if (collection && collection instanceof DistributedCollection) {
      await collection.detachFromNetwork();
    }
  }

  /**
   * Get network manager
   */
  getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  /**
   * Shutdown the distributed database
   */
  async shutdown(): Promise<void> {
    await this.networkManager.shutdown();
  }

  // Private methods

  private async initializeDistributed(config: {
    networkId?: string;
    bootstrapPeers?: string[];
  }): Promise<void> {
    await this.networkManager.initialize();

    if (config.networkId) {
      if (config.bootstrapPeers && config.bootstrapPeers.length > 0) {
        await this.networkManager.joinNetwork(config.networkId, config.bootstrapPeers);
      } else {
        await this.networkManager.createNetwork({
          networkId: config.networkId,
          name: `Network ${config.networkId}`,
          bootstrapPeers: [],
          encryption: { enabled: true },
          replication: { factor: 3, strategy: 'full' },
          discovery: { mdns: true, bootstrap: true }
        });
      }
    }
  }
}

/**
 * Create a distributed database
 */
export function createDistributedDb(options: DistributedDbOptions): DistributedDatabase {
  return new DistributedDatabase(options);
}