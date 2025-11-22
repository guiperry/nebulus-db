import { Adapter, Document } from '@nebulus-db/core';
import { ChromaClient, Collection as ChromaCollection } from 'chromadb';
import {
  VectorDocument,
  VectorSearchResult,
  VectorQueryOptions,
  VectorCollectionConfig,
  DistanceFunction,
  Embedding
} from './vector-types';

export interface ChromaVectorAdapterOptions {
  url?: string;
  inMemory?: boolean;
  defaultCollectionConfig?: Partial<VectorCollectionConfig>;
}

export class ChromaVectorAdapter implements Adapter {
  private client: ChromaClient;
  private collectionConfigs: Map<string, VectorCollectionConfig> = new Map();
  private defaultConfig: Partial<VectorCollectionConfig>;

  constructor(options: ChromaVectorAdapterOptions = {}) {
    const { url = 'http://localhost:8000', inMemory = false, defaultCollectionConfig = {} } = options;

    if (inMemory) {
      this.client = new ChromaClient({ path: undefined });
    } else {
      this.client = new ChromaClient({ path: url });
    }

    this.defaultConfig = defaultCollectionConfig;
  }

  /**
   * Configure a collection for vector search
   */
  configureCollection(collectionName: string, config: VectorCollectionConfig): void {
    this.collectionConfigs.set(collectionName, config);
  }

  /**
   * Load data from ChromaDB
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const collectionNames = await this.client.listCollections();
      const data: Record<string, Document[]> = {};

      for (const collectionName of collectionNames) {
        const chromaCollection = await this.client.getCollection({
          name: collectionName,
          embeddingFunction: undefined as any
        });

        const result = await chromaCollection.get();

        if (result.ids && result.ids.length > 0) {
          data[collectionName] = result.ids.map((id, index) => {
            const doc: VectorDocument = {
              id: id,
              _text: result.documents?.[index] as string || '',
              _embedding: result.embeddings?.[index] as Embedding
            };

            // Add metadata fields
            if (result.metadatas?.[index]) {
              Object.assign(doc, result.metadatas[index]);
            }

            return doc;
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
   * Save data to ChromaDB with embeddings
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      for (const [collectionName, documents] of Object.entries(data)) {
        const config = this.collectionConfigs.get(collectionName);

        // Get or create collection
        let collection: ChromaCollection;
        try {
          collection = await this.client.getCollection({
            name: collectionName,
            embeddingFunction: undefined as any
          });
        } catch (error) {
          // Create collection with HNSW configuration
          const metadata: Record<string, any> = {};

          if (config) {
            metadata['hnsw:space'] = config.distanceFunction || DistanceFunction.COSINE;

            if (config.hnsw) {
              if (config.hnsw.m) metadata['hnsw:M'] = config.hnsw.m;
              if (config.hnsw.efConstruction) metadata['hnsw:construction_ef'] = config.hnsw.efConstruction;
              if (config.hnsw.efSearch) metadata['hnsw:search_ef'] = config.hnsw.efSearch;
              if (config.hnsw.batchSize) metadata['hnsw:batch_size'] = config.hnsw.batchSize;
            }
          }

          collection = await this.client.createCollection({
            name: collectionName,
            metadata
          });
        }

        // Clear existing documents
        const existing = await collection.get();
        if (existing.ids.length > 0) {
          await collection.delete({ ids: existing.ids });
        }

        if (documents.length === 0) continue;

        // Prepare embeddings
        const embeddings = await this.prepareEmbeddings(collectionName, documents);

        // Extract text field
        const texts = documents.map(doc => {
          const textField = config?.textField || '_text';
          return (doc as any)[textField] || JSON.stringify(doc);
        });

        // Extract metadata
        const metadatas = documents.map(doc => {
          const { id, _embedding, _text, toJSON, ...metadata } = doc as any;
          return metadata;
        });

        // Add documents with embeddings
        await collection.add({
          ids: documents.map(d => String(d.id)),
          documents: texts,
          embeddings: embeddings,
          metadatas: metadatas
        });
      }
    } catch (error) {
      console.error('Failed to save data to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(
    collectionName: string,
    options: VectorQueryOptions
  ): Promise<VectorSearchResult[]> {
    try {
      const collection = await this.client.getCollection({
        name: collectionName,
        embeddingFunction: undefined as any
      });

      const config = this.collectionConfigs.get(collectionName);

      // Generate query embedding if needed
      let queryEmbedding: Embedding;

      if (options.queryEmbedding) {
        queryEmbedding = options.queryEmbedding;
      } else if (options.queryText && config?.embeddingFunction) {
        const embeddings = await config.embeddingFunction.generate([options.queryText]);
        queryEmbedding = embeddings[0];
      } else {
        throw new Error('Either queryText with configured embedding function or queryEmbedding must be provided');
      }

      // Perform vector search
      const result = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: options.limit || 10,
        where: options.where
      });

      // Convert results
      const results: VectorSearchResult[] = [];

      if (result.ids?.[0]) {
        for (let i = 0; i < result.ids[0].length; i++) {
          const distance = result.distances?.[0]?.[i] ?? 0;

          // Skip if distance threshold is set and exceeded
          if (options.distanceThreshold !== undefined && distance > options.distanceThreshold) {
            continue;
          }

          const doc: VectorDocument = {
            id: result.ids[0][i],
            _text: result.documents?.[0]?.[i] as string || ''
          };

          // Add metadata
          if (result.metadatas?.[0]?.[i]) {
            Object.assign(doc, result.metadatas[0][i]);
          }

          // Add embedding if requested
          if (options.includeEmbeddings && result.embeddings?.[0]?.[i]) {
            doc._embedding = result.embeddings[0][i] as Embedding;
          }

          // Convert distance to similarity score (normalized 0-1)
          const score = this.distanceToScore(distance, config?.distanceFunction || DistanceFunction.COSINE);

          results.push({
            document: doc,
            distance,
            score
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    // ChromaDB client doesn't require explicit closing
  }

  // Private methods

  private async prepareEmbeddings(
    collectionName: string,
    documents: Document[]
  ): Promise<Embedding[]> {
    const config = this.collectionConfigs.get(collectionName);

    if (!config?.embeddingFunction) {
      // No embedding function configured, use zero vectors
      const dimension = 1536; // Default dimension
      return documents.map(() => new Array(dimension).fill(0));
    }

    // Check if documents already have embeddings
    const existingEmbeddings = documents.map(d => (d as VectorDocument)._embedding);

    if (existingEmbeddings.every(e => e !== undefined)) {
      return existingEmbeddings as Embedding[];
    }

    // Extract texts to embed
    const textField = config.textField || '_text';
    const texts = documents.map(doc => {
      return (doc as any)[textField] || JSON.stringify(doc);
    });

    // Generate embeddings
    return await config.embeddingFunction.generate(texts);
  }

  private distanceToScore(distance: number, distanceFunction: DistanceFunction): number {
    switch (distanceFunction) {
      case DistanceFunction.COSINE:
        // Cosine distance is 1 - cosine similarity
        // Convert to similarity score (0-1, higher is better)
        return 1 - distance;

      case DistanceFunction.L2:
        // L2 distance (Euclidean)
        // Use inverse: 1 / (1 + distance)
        return 1 / (1 + distance);

      case DistanceFunction.IP:
        // Inner product (negative for distance)
        // Convert to positive similarity
        return Math.max(0, -distance);

      default:
        return 1 - distance;
    }
  }
}