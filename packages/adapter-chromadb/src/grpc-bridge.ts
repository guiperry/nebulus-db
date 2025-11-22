import { Adapter, Document } from '@nebulus-db/core';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { VectorQueryOptions, VectorSearchResult } from './vector-types';
import path from 'path';

export interface GrpcBridgeOptions {
  serverAddress?: string;
  protoPath?: string;
}

export class ChromemGrpcAdapter implements Adapter {
  private client: any;
  private connected: boolean = false;

  constructor(options: GrpcBridgeOptions = {}) {
    const serverAddress = options.serverAddress || 'localhost:50051';
    const protoPath = options.protoPath || path.join(__dirname, '../go-adapter/proto/adapter.proto');

    // Load proto file
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const ChromemAdapter = protoDescriptor.nebulusdb.adapter.ChromemAdapter;

    // Create client
    this.client = new ChromemAdapter(
      serverAddress,
      grpc.credentials.createInsecure()
    );

    this.connected = true;
  }

  /**
   * Load data from ChromaDB via Go adapter
   */
  async load(): Promise<Record<string, Document[]>> {
    return new Promise((resolve, reject) => {
      this.client.Load({}, (error: any, response: any) => {
        if (error) {
          console.error('Failed to load data:', error);
          reject(error);
          return;
        }

        const data: Record<string, Document[]> = {};

        for (const [collectionName, docList] of Object.entries(response.data as any)) {
          data[collectionName] = (docList as any).documents.map((doc: any) => ({
            id: doc.id,
            _text: doc.text,
            _embedding: doc.embedding,
            ...this.parseDataMap(doc.data)
          }));
        }

        resolve(data);
      });
    });
  }

  /**
   * Save data to ChromaDB via Go adapter
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    return new Promise((resolve, reject) => {
      const request: any = {
        data: {}
      };

      for (const [collectionName, documents] of Object.entries(data)) {
        request.data[collectionName] = {
          documents: documents.map(doc => {
            const { id, _text, _embedding, toJSON, ...rest } = doc as any;
            return {
              id: String(id),
              text: _text || '',
              embedding: _embedding || [],
              data: this.stringifyDataMap(rest)
            };
          })
        };
      }

      this.client.Save(request, (error: any, response: any) => {
        if (error) {
          console.error('Failed to save data:', error);
          reject(error);
          return;
        }

        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        resolve();
      });
    });
  }

  /**
   * Configure a collection for vector search
   */
  async configureCollection(collectionName: string, config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = {
        collection_name: collectionName,
        config: {
          embedding_model: config.embeddingModel || '',
          embedding_provider: config.embeddingProvider || '',
          distance_function: config.distanceFunction || 'cosine',
          text_field: config.textField || '_text',
          hnsw_config: config.hnswConfig || {}
        }
      };

      this.client.ConfigureCollection(request, (error: any, response: any) => {
        if (error) {
          console.error('Failed to configure collection:', error);
          reject(error);
          return;
        }

        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        resolve();
      });
    });
  }

  /**
   * Perform vector search via Go adapter
   */
  async vectorSearch(
    collectionName: string,
    options: VectorQueryOptions
  ): Promise<VectorSearchResult[]> {
    return new Promise((resolve, reject) => {
      const request = {
        collection_name: collectionName,
        query_text: options.queryText || '',
        limit: options.limit || 10,
        filter: this.stringifyDataMap(options.where || {})
      };

      this.client.VectorSearch(request, (error: any, response: any) => {
        if (error) {
          console.error('Vector search failed:', error);
          reject(error);
          return;
        }

        const results: VectorSearchResult[] = response.results.map((result: any) => ({
          document: {
            id: result.document.id,
            _text: result.document.text,
            _embedding: result.document.embedding,
            ...this.parseDataMap(result.document.data)
          },
          distance: result.distance,
          score: result.score
        }));

        resolve(results);
      });
    });
  }

  /**
   * Close the adapter
   */
  async close(): Promise<void> {
    if (!this.connected) return;

    return new Promise((resolve, reject) => {
      this.client.Close({}, (error: any, response: any) => {
        if (error) {
          console.error('Failed to close adapter:', error);
          reject(error);
          return;
        }

        this.connected = false;
        resolve();
      });
    });
  }

  // Helper methods

  private parseDataMap(dataMap: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(dataMap)) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    }

    return result;
  }

  private stringifyDataMap(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = JSON.stringify(value);
      }
    }

    return result;
  }
}