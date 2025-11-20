import { Adapter, Document } from '@nebulus-db/core';
import { ChromaClient } from 'chromadb';

/**
 * Options for ChromadbAdapter
 */
export interface ChromadbAdapterOptions {
  /** ChromaDB server URL (default: http://localhost:8000) */
  url?: string;
  /** Use in-memory ChromaDB for testing (default: false) */
  inMemory?: boolean;
}

/**
 * ChromaDB adapter for NebulusDB
 */
export class ChromadbAdapter implements Adapter {
  private client: ChromaClient;

  /**
   * Create a new ChromadbAdapter
   * @param options ChromaDB connection options
   */
  constructor(options: ChromadbAdapterOptions = {}) {
    const { url = 'http://localhost:8000', inMemory = false } = options;
    if (inMemory) {
      this.client = new ChromaClient({ path: undefined });
    } else {
      this.client = new ChromaClient({ path: url });
    }
  }

  /**
   * Load data from ChromaDB
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const collectionNames = await this.client.listCollections();
      const data: Record<string, Document[]> = {};

      for (const collectionName of collectionNames) {
        const chromaCollection = await this.client.getCollection({ name: collectionName, embeddingFunction: null as any });
        const result = await chromaCollection.get();

        if (result.documents && result.documents.length > 0) {
          data[collectionName] = result.documents.map((doc: any, index: number) => {
            try {
              // Parse the stored JSON document
              const parsedDoc: Document = typeof doc === 'string' ? JSON.parse(doc) : doc;
              return parsedDoc;
            } catch (parseError) {
              console.error(`Failed to parse document in collection ${collectionName}:`, parseError);
              // Return a basic document if parsing fails
              return {
                id: result.ids?.[index] || `unknown_${index}`,
                ...((typeof doc === 'object' && doc !== null) ? doc : {})
              } as Document;
            }
          });
        } else {
          data[collectionName] = [];
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to load data from ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Save data to ChromaDB
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      for (const [collectionName, documents] of Object.entries(data)) {
        // Get or create collection
        let collection;
        try {
          collection = await this.client.getCollection({ name: collectionName, embeddingFunction: null as any });
        } catch (error) {
          // Collection doesn't exist, create it
          collection = await this.client.createCollection({ name: collectionName });
        }

        // Clear existing documents
        await collection.delete();

        // Prepare data for ChromaDB
        if (documents.length > 0) {
          const ids = documents.map(doc => doc.id);
          const chromaDocuments = documents.map(doc => JSON.stringify(doc));

          // Add documents to collection
          await collection.add({
            ids: ids as string[],
            documents: chromaDocuments
          });
        }
      }
    } catch (error) {
      console.error('Failed to save data to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Close the ChromaDB connection
   */
  async close(): Promise<void> {
    // ChromaDB client doesn't require explicit closing
  }
}