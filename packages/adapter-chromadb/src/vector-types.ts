import { Document } from '@nebulus-db/core';

/**
 * Embedding vector type
 */
export type Embedding = number[];

/**
 * Distance functions for vector similarity
 */
export enum DistanceFunction {
  L2 = 'l2',           // Euclidean distance
  COSINE = 'cosine',   // Cosine similarity
  IP = 'ip'            // Inner product
}

/**
 * Embedding function interface
 */
export interface EmbeddingFunction {
  /**
   * Generate embeddings for texts
   */
  generate(texts: string[]): Promise<Embedding[]>;

  /**
   * Get the dimension of embeddings produced
   */
  dimension(): number;

  /**
   * Get the name of the embedding model
   */
  modelName(): string;
}

/**
 * Vector document with embedding
 */
export interface VectorDocument extends Document {
  _embedding?: Embedding;
  _text?: string;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  document: VectorDocument;
  distance: number;
  score: number; // Normalized similarity score (0-1)
}

/**
 * Vector query options
 */
export interface VectorQueryOptions {
  /** Query text (will be embedded automatically) */
  queryText?: string;

  /** Pre-computed query embedding */
  queryEmbedding?: Embedding;

  /** Number of results to return */
  limit?: number;

  /** Metadata filter to apply */
  where?: Record<string, any>;

  /** Distance threshold (results must be closer than this) */
  distanceThreshold?: number;

  /** Include embeddings in results */
  includeEmbeddings?: boolean;

  /** Include distances in results */
  includeDistances?: boolean;
}

/**
 * Collection configuration for vector search
 */
export interface VectorCollectionConfig {
  /** Embedding function to use */
  embeddingFunction: EmbeddingFunction;

  /** Distance function for similarity */
  distanceFunction?: DistanceFunction;

  /** Text field to embed (default: '_text' or first string field) */
  textField?: string;

  /** HNSW configuration */
  hnsw?: {
    /** Number of bi-directional links (default: 16) */
    m?: number;

    /** Size of dynamic candidate list (default: 200) */
    efConstruction?: number;

    /** Search effort parameter (default: 10) */
    efSearch?: number;

    /** Batch size for indexing (default: 100) */
    batchSize?: number;
  };
}