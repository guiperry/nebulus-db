import { Adapter, Document } from '@nebulus-db/core';

/**
 * IndexedDB adapter for NebulusDB
 */
export class IndexeddbAdapter implements Adapter {
  private readonly dbName = 'NebulusDB';
  private readonly storeName = 'documents';
  private db: IDBDatabase | null = null;

  /**
   * Create a new IndexeddbAdapter
   */
  constructor() {
    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not supported in this environment');
    }
  }

  /**
   * Get or open the IndexedDB database
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: ['collection', 'id'] });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * Load data from IndexedDB
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      return new Promise<Record<string, Document[]>>((resolve, reject) => {
        request.onsuccess = () => {
          const storedDocs = request.result as Array<Document & { collection: string }>;
          const data: Record<string, Document[]> = {};

          for (const doc of storedDocs) {
            const { collection, ...document } = doc;
            if (!data[collection]) {
              data[collection] = [];
            }
            data[collection].push(document);
          }

          resolve(data);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to load data from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Save data to IndexedDB
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Clear existing data
      store.clear();

      // Add new data
      for (const [collection, docs] of Object.entries(data)) {
        for (const doc of docs) {
          store.add({ collection, ...doc });
        }
      }

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Failed to save data to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Close the IndexedDB connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}