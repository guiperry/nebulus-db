import { Adapter, Document } from '@nebulus-db/core';
import { createClient, RedisClientType } from 'redis';

/**
 * Options for connecting to Amazon MemoryDB
 */
export interface MemoryDBOptions {
  /** MemoryDB cluster endpoint host */
  host: string;
  /** MemoryDB cluster endpoint port */
  port: number;
  /** Password for authentication (if required) */
  password?: string;
  /** Username for authentication (if using IAM, this might be different) */
  username?: string;
  /** TLS options for secure connection */
  tls?: {
    ca?: string;
    cert?: string;
    key?: string;
  };
}

/**
 * MemoryDB adapter for NebulusDB using Redis protocol
 */
export class MemoryAdapter implements Adapter {
  private client: RedisClientType;
  private connected = false;

  /**
   * Create a new MemoryAdapter
   * @param options Connection options for MemoryDB
   */
  constructor(options: MemoryDBOptions) {
    const protocol = options.tls ? 'rediss' : 'redis';
    const auth = options.username && options.password ? `${options.username}:${options.password}@` : options.password ? `:${options.password}@` : '';
    const url = `${protocol}://${auth}${options.host}:${options.port}`;

    this.client = createClient({
      url,
      ...options.tls,
    });

    // Connect immediately
    this.connect();
  }

  /**
   * Establish connection to MemoryDB
   */
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to MemoryDB:', error);
      throw new Error(`MemoryDB connection failed: ${error}`);
    }
  }

  /**
   * Load data from MemoryDB
   */
  async load(): Promise<Record<string, Document[]>> {
    if (!this.connected) {
      throw new Error('Not connected to MemoryDB');
    }

    try {
      const data: Record<string, Document[]> = {};

      // Get all collection names
      const collections = await this.client.SMEMBERS('collections');

      // Load documents for each collection
      for (const collection of collections) {
        const docStrings = await this.client.HGETALL(collection);
        const documents: Document[] = [];

        for (const docJson of Object.values(docStrings)) {
          try {
            const doc = JSON.parse(docJson as string) as Document;
            documents.push(doc);
          } catch (parseError) {
            console.warn(`Failed to parse document in collection ${collection}:`, parseError);
          }
        }

        if (documents.length > 0) {
          data[collection] = documents;
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to load data from MemoryDB:', error);
      throw error;
    }
  }

  /**
   * Save data to MemoryDB
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to MemoryDB');
    }

    try {
      // Start a transaction-like operation (Redis doesn't have true transactions for multiple keys easily)
      // First, clear existing collections
      const existingCollections = await this.client.SMEMBERS('collections');

      for (const collection of existingCollections) {
        await this.client.DEL(collection);
      }
      await this.client.DEL('collections');

      // Save new data
      for (const [collection, documents] of Object.entries(data)) {
        if (documents.length === 0) continue;

        // Add collection to set
        await this.client.SADD('collections', collection);

        // Store documents as hash fields
        const hashData: Record<string, string> = {};
        for (const doc of documents) {
          hashData[doc.id] = JSON.stringify(doc);
        }

        await this.client.HSET(collection, hashData);
      }
    } catch (error) {
      console.error('Failed to save data to MemoryDB:', error);
      throw error;
    }
  }

  /**
   * Close the MemoryDB connection
   */
  async close(): Promise<void> {
    if (this.connected) {
      try {
        await this.client.disconnect();
        this.connected = false;
      } catch (error) {
        console.error('Error closing MemoryDB connection:', error);
      }
    }
  }
}