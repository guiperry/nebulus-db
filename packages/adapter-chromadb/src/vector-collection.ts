import { Collection } from '@nebulus-db/core';
import { ChromaVectorAdapter } from './vector-adapter';
import { VectorQueryOptions, VectorSearchResult } from './vector-types';

export class VectorCollection extends Collection {
  private vectorAdapter: ChromaVectorAdapter;

  constructor(
    name: string,
    vectorAdapter: ChromaVectorAdapter,
    initialDocs: any[] = [],
    options: any = {},
    plugins: any[] = []
  ) {
    super(name, initialDocs, options, plugins);
    this.vectorAdapter = vectorAdapter;
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(options: VectorQueryOptions): Promise<VectorSearchResult[]> {
    return await this.vectorAdapter.vectorSearch(this.name, options);
  }

  /**
   * Hybrid search: combine vector search with metadata filtering
   */
  async hybridSearch(options: VectorQueryOptions & { filter?: any }): Promise<VectorSearchResult[]> {
    // Perform vector search with metadata filter
    const vectorResults = await this.vectorAdapter.vectorSearch(this.name, {
      ...options,
      where: options.filter
    });

    return vectorResults;
  }

  /**
   * Find similar documents to a given document
   */
  async findSimilar(documentId: string | number, limit: number = 10): Promise<VectorSearchResult[]> {
    const doc = await this.findOne({ id: documentId });

    if (!doc) {
      throw new Error(`Document with id ${documentId} not found`);
    }

    const embedding = (doc as any)._embedding;

    if (!embedding) {
      throw new Error(`Document ${documentId} does not have an embedding`);
    }

    return await this.vectorSearch({
      queryEmbedding: embedding,
      limit: limit + 1 // +1 because the document itself will be included
    }).then(results => results.filter(r => r.document.id !== documentId).slice(0, limit));
  }
}