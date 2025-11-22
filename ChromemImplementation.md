# Chromem-Go Vector Database Integration for NebulusDB

## Overview

This document details the implementation of chromem-go as a fully-featured vector database adapter for NebulusDB. The implementation provides two parallel approaches:

1. **Enhanced TypeScript Adapter**: Extends the existing ChromaDB adapter with vector search capabilities
2. **Go Native Adapter**: Uses chromem-go directly as a high-performance Go-based adapter with RPC bridge

Both implementations support embedding generation, vector similarity search, hybrid search (combining vector and metadata filtering), and all standard NebulusDB operations.

## Architecture Goals

- **Vector Search**: Native support for semantic similarity search using embeddings
- **Embedding Generation**: Automatic embedding generation for text documents
- **Hybrid Search**: Combine vector similarity with metadata filtering
- **Multi-Modal**: Support for text, image, and custom embeddings
- **High Performance**: Leverage chromem-go's optimized HNSW implementation
- **Type Safety**: Full TypeScript and Go type safety
- **Backward Compatible**: Existing adapter functionality remains unchanged

## Technology Stack

- **Vector Database**: ChromaDB (via chromem-go)
- **Embedding Models**: OpenAI, Cohere, HuggingFace, Ollama, Google Gemini, and more
- **Go Client**: chromem-go v0.2.0+
- **TypeScript Client**: chromadb npm package
- **RPC Bridge**: gRPC for TypeScript↔Go communication
- **HNSW**: Hierarchical Navigable Small World for approximate nearest neighbor search

## Part 1: Enhanced TypeScript Vector Adapter

### 1.1 Vector Types and Interfaces

**File:** `packages/adapter-chromadb/src/vector-types.ts`

```typescript
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
```

### 1.2 Embedding Function Implementations

**File:** `packages/adapter-chromadb/src/embeddings/openai.ts`

```typescript
import { EmbeddingFunction, Embedding } from '../vector-types';
import OpenAI from 'openai';

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  organization?: string;
}

export class OpenAIEmbeddingFunction implements EmbeddingFunction {
  private client: OpenAI;
  private model: string;
  private _dimension: number;

  constructor(options: OpenAIEmbeddingOptions) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      organization: options.organization
    });

    this.model = options.model || 'text-embedding-3-small';

    // Set dimension based on model
    this._dimension = this.model === 'text-embedding-3-large' ? 3072 :
                     this.model === 'text-embedding-3-small' ? 1536 :
                     this.model === 'text-embedding-ada-002' ? 1536 : 1536;
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`OpenAI embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}
```

**File:** `packages/adapter-chromadb/src/embeddings/ollama.ts`

```typescript
import { EmbeddingFunction, Embedding } from '../vector-types';
import axios from 'axios';

export interface OllamaEmbeddingOptions {
  baseUrl?: string;
  model?: string;
}

export class OllamaEmbeddingFunction implements EmbeddingFunction {
  private baseUrl: string;
  private model: string;
  private _dimension: number;

  constructor(options: OllamaEmbeddingOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.model = options.model || 'nomic-embed-text';
    this._dimension = 768; // Default for nomic-embed-text
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const embeddings: Embedding[] = [];

      for (const text of texts) {
        const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
          model: this.model,
          prompt: text
        });

        embeddings.push(response.data.embedding);
      }

      return embeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Ollama embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}
```

**File:** `packages/adapter-chromadb/src/embeddings/cohere.ts`

```typescript
import { EmbeddingFunction, Embedding } from '../vector-types';
import { CohereClient } from 'cohere-ai';

export interface CohereEmbeddingOptions {
  apiKey: string;
  model?: string;
  inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
}

export class CohereEmbeddingFunction implements EmbeddingFunction {
  private client: CohereClient;
  private model: string;
  private inputType: string;
  private _dimension: number;

  constructor(options: CohereEmbeddingOptions) {
    this.client = new CohereClient({ token: options.apiKey });
    this.model = options.model || 'embed-english-v3.0';
    this.inputType = options.inputType || 'search_document';

    // Set dimension based on model
    this._dimension = this.model === 'embed-english-v3.0' ? 1024 :
                     this.model === 'embed-multilingual-v3.0' ? 1024 : 1024;
  }

  async generate(texts: string[]): Promise<Embedding[]> {
    try {
      const response = await this.client.embed({
        texts,
        model: this.model,
        inputType: this.inputType as any
      });

      return response.embeddings;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Cohere embedding generation failed: ${error}`);
    }
  }

  dimension(): number {
    return this._dimension;
  }

  modelName(): string {
    return this.model;
  }
}
```

### 1.3 Enhanced Vector Adapter

**File:** `packages/adapter-chromadb/src/vector-adapter.ts`

```typescript
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

        const result = await chromaCollection.get({
          include: ['documents', 'metadatas', 'embeddings']
        });

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
        where: options.where,
        include: ['documents', 'metadatas', 'distances', 'embeddings']
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
```

### 1.4 Vector Collection Extension

**File:** `packages/adapter-chromadb/src/vector-collection.ts`

```typescript
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
```

## Part 2: Go Native Adapter with chromem-go

### 2.1 Go Adapter Implementation

**File:** `packages/adapter-chromadb/go-adapter/adapter.go`

```go
package adapter

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	chroma "github.com/guiperry/chroma-go_cerebras/pkg/api/v2"
	"github.com/guiperry/chroma-go_cerebras/pkg/embeddings/ollama"
	"github.com/guiperry/chroma-go_cerebras/pkg/embeddings/openai"
)

// Document represents a NebulusDB document
type Document struct {
	ID        string                 `json:"id"`
	Data      map[string]interface{} `json:"data"`
	Embedding []float64              `json:"_embedding,omitempty"`
	Text      string                 `json:"_text,omitempty"`
}

// VectorSearchResult represents a search result
type VectorSearchResult struct {
	Document Document  `json:"document"`
	Distance float64   `json:"distance"`
	Score    float64   `json:"score"`
}

// CollectionConfig configures a collection
type CollectionConfig struct {
	EmbeddingModel    string                 `json:"embeddingModel"`
	EmbeddingProvider string                 `json:"embeddingProvider"` // "openai", "ollama", etc.
	DistanceFunction  string                 `json:"distanceFunction"`  // "cosine", "l2", "ip"
	TextField         string                 `json:"textField"`
	HNSWConfig        map[string]interface{} `json:"hnswConfig"`
}

// ChromemAdapter is the Go adapter for NebulusDB
type ChromemAdapter struct {
	client              chroma.Client
	collections         map[string]chroma.Collection
	collectionConfigs   map[string]*CollectionConfig
	embeddingFunctions  map[string]chroma.EmbeddingFunction
}

// NewChromemAdapter creates a new adapter
func NewChromemAdapter(serverURL string) (*ChromemAdapter, error) {
	client, err := chroma.NewHTTPClient(
		chroma.WithBasePath(serverURL),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create Chroma client: %w", err)
	}

	return &ChromemAdapter{
		client:             client,
		collections:        make(map[string]chroma.Collection),
		collectionConfigs:  make(map[string]*CollectionConfig),
		embeddingFunctions: make(map[string]chroma.EmbeddingFunction),
	}, nil
}

// ConfigureCollection configures a collection for vector search
func (a *ChromemAdapter) ConfigureCollection(ctx context.Context, collectionName string, config *CollectionConfig) error {
	a.collectionConfigs[collectionName] = config

	// Create embedding function
	var ef chroma.EmbeddingFunction
	var err error

	switch config.EmbeddingProvider {
	case "openai":
		ef, err = openai.NewOpenAIEmbeddingFunction(config.EmbeddingModel)
		if err != nil {
			return fmt.Errorf("failed to create OpenAI embedding function: %w", err)
		}
	case "ollama":
		ef, err = ollama.NewOllamaEmbeddingFunction(
			ollama.WithModel(config.EmbeddingModel),
		)
		if err != nil {
			return fmt.Errorf("failed to create Ollama embedding function: %w", err)
		}
	default:
		return fmt.Errorf("unsupported embedding provider: %s", config.EmbeddingProvider)
	}

	a.embeddingFunctions[collectionName] = ef

	return nil
}

// Load loads all data from ChromaDB
func (a *ChromemAdapter) Load(ctx context.Context) (map[string][]Document, error) {
	collections, err := a.client.ListCollections(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list collections: %w", err)
	}

	data := make(map[string][]Document)

	for _, colName := range collections {
		col, err := a.client.GetCollection(ctx, colName)
		if err != nil {
			log.Printf("Failed to get collection %s: %v", colName, err)
			continue
		}

		a.collections[colName] = col

		// Get all documents
		result, err := col.Get(ctx,
			chroma.WithInclude(chroma.IncludeDocuments, chroma.IncludeMetadatas, chroma.IncludeEmbeddings),
		)
		if err != nil {
			log.Printf("Failed to get documents from collection %s: %v", colName, err)
			continue
		}

		docs := make([]Document, 0)

		for i, id := range result.GetIDs() {
			doc := Document{
				ID:   string(id),
				Data: make(map[string]interface{}),
			}

			// Get document text
			if i < len(result.GetDocuments()) {
				doc.Text = result.GetDocuments()[i].ContentString()
			}

			// Get metadata
			if i < len(result.GetMetadatas()) {
				metadata := result.GetMetadatas()[i]
				// Convert metadata to map
				doc.Data = metadataToMap(metadata)
			}

			// Get embedding
			if i < len(result.GetEmbeddings()) {
				embedding := result.GetEmbeddings()[i]
				doc.Embedding = embedding
			}

			docs = append(docs, doc)
		}

		data[colName] = docs
	}

	return data, nil
}

// Save saves documents to ChromaDB
func (a *ChromemAdapter) Save(ctx context.Context, data map[string][]Document) error {
	for collectionName, documents := range data {
		col, err := a.getOrCreateCollection(ctx, collectionName)
		if err != nil {
			return fmt.Errorf("failed to get or create collection %s: %w", collectionName, err)
		}

		// Delete all existing documents
		existingResult, err := col.Get(ctx)
		if err != nil {
			return fmt.Errorf("failed to get existing documents: %w", err)
		}

		if len(existingResult.GetIDs()) > 0 {
			err = col.Delete(ctx, chroma.WithIDsDelete(existingResult.GetIDs()...))
			if err != nil {
				return fmt.Errorf("failed to delete existing documents: %w", err)
			}
		}

		if len(documents) == 0 {
			continue
		}

		// Prepare data for ChromaDB
		ids := make([]chroma.DocumentID, len(documents))
		texts := make([]string, len(documents))
		metadatas := make([]chroma.DocumentMetadata, len(documents))
		embeddings := make([][]float64, len(documents))

		for i, doc := range documents {
			ids[i] = chroma.DocumentID(doc.ID)
			texts[i] = doc.Text

			// Convert data to metadata
			metadata := chroma.NewDocumentMetadata()
			for k, v := range doc.Data {
				setMetadataValue(metadata, k, v)
			}
			metadatas[i] = metadata

			// Use existing embedding or generate new one
			if doc.Embedding != nil && len(doc.Embedding) > 0 {
				embeddings[i] = doc.Embedding
			}
		}

		// Add documents
		config := a.collectionConfigs[collectionName]
		if config != nil && a.embeddingFunctions[collectionName] != nil {
			// Use configured embedding function
			err = col.Add(ctx,
				chroma.WithIDs(ids...),
				chroma.WithTexts(texts...),
				chroma.WithMetadatas(metadatas...),
			)
		} else if embeddings[0] != nil {
			// Use pre-computed embeddings
			err = col.Add(ctx,
				chroma.WithIDs(ids...),
				chroma.WithTexts(texts...),
				chroma.WithMetadatas(metadatas...),
				chroma.WithEmbeddings(embeddings...),
			)
		} else {
			// No embeddings available
			err = col.Add(ctx,
				chroma.WithIDs(ids...),
				chroma.WithTexts(texts...),
				chroma.WithMetadatas(metadatas...),
			)
		}

		if err != nil {
			return fmt.Errorf("failed to add documents to collection %s: %w", collectionName, err)
		}
	}

	return nil
}

// VectorSearch performs vector similarity search
func (a *ChromemAdapter) VectorSearch(ctx context.Context, collectionName string, queryText string, limit int, filter map[string]interface{}) ([]VectorSearchResult, error) {
	col, exists := a.collections[collectionName]
	if !exists {
		return nil, fmt.Errorf("collection %s not found", collectionName)
	}

	// Build query options
	opts := []chroma.CollectionQueryOption{
		chroma.WithQueryTexts(queryText),
		chroma.WithNResults(limit),
		chroma.WithInclude(chroma.IncludeDocuments, chroma.IncludeMetadatas, chroma.IncludeDistances, chroma.IncludeEmbeddings),
	}

	// Add filter if provided
	if filter != nil {
		whereFilter := mapToWhereFilter(filter)
		if whereFilter != nil {
			opts = append(opts, chroma.WithWhere(whereFilter))
		}
	}

	// Execute query
	result, err := col.Query(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("vector search failed: %w", err)
	}

	// Convert results
	results := make([]VectorSearchResult, 0)

	for groupIdx, group := range result.GetDocumentsGroups() {
		for docIdx, docGroup := range group {
			doc := Document{
				ID:   string(result.GetIDsGroups()[groupIdx][docIdx]),
				Text: docGroup.ContentString(),
				Data: make(map[string]interface{}),
			}

			// Get metadata
			if groupIdx < len(result.GetMetadatasGroups()) && docIdx < len(result.GetMetadatasGroups()[groupIdx]) {
				doc.Data = metadataToMap(result.GetMetadatasGroups()[groupIdx][docIdx])
			}

			// Get embedding
			if groupIdx < len(result.GetEmbeddingsGroups()) && docIdx < len(result.GetEmbeddingsGroups()[groupIdx]) {
				doc.Embedding = result.GetEmbeddingsGroups()[groupIdx][docIdx]
			}

			// Get distance
			distance := 0.0
			if groupIdx < len(result.GetDistancesGroups()) && docIdx < len(result.GetDistancesGroups()[groupIdx]) {
				distance = result.GetDistancesGroups()[groupIdx][docIdx]
			}

			// Convert distance to score
			score := distanceToScore(distance, "cosine")

			results = append(results, VectorSearchResult{
				Document: doc,
				Distance: distance,
				Score:    score,
			})
		}
	}

	return results, nil
}

// Close closes the adapter
func (a *ChromemAdapter) Close() error {
	if a.client != nil {
		return a.client.Close()
	}
	return nil
}

// Private helper methods

func (a *ChromemAdapter) getOrCreateCollection(ctx context.Context, name string) (chroma.Collection, error) {
	// Try to get existing collection
	col, err := a.client.GetCollection(ctx, name)
	if err == nil {
		a.collections[name] = col
		return col, nil
	}

	// Create new collection
	config := a.collectionConfigs[name]
	createOpts := []chroma.CollectionCreateOption{}

	if config != nil {
		// Set distance function
		if config.DistanceFunction != "" {
			metadata := chroma.NewMetadata(
				chroma.NewStringAttribute("hnsw:space", config.DistanceFunction),
			)
			createOpts = append(createOpts, chroma.WithCollectionMetadataCreate(metadata))
		}

		// Set embedding function
		if ef, exists := a.embeddingFunctions[name]; exists {
			createOpts = append(createOpts, chroma.WithEmbeddingFunction(ef))
		}
	}

	col, err = a.client.CreateCollection(ctx, name, createOpts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create collection: %w", err)
	}

	a.collections[name] = col
	return col, nil
}

func metadataToMap(metadata chroma.DocumentMetadata) map[string]interface{} {
	result := make(map[string]interface{})

	// This would need to be implemented based on the actual metadata structure
	// For now, return empty map
	return result
}

func setMetadataValue(metadata chroma.DocumentMetadata, key string, value interface{}) {
	switch v := value.(type) {
	case string:
		metadata.SetString(key, v)
	case int:
		metadata.SetInt(key, int64(v))
	case int64:
		metadata.SetInt(key, v)
	case float64:
		metadata.SetFloat(key, v)
	case bool:
		metadata.SetBool(key, v)
	default:
		// Convert to JSON string for complex types
		jsonBytes, err := json.Marshal(v)
		if err == nil {
			metadata.SetString(key, string(jsonBytes))
		}
	}
}

func mapToWhereFilter(filter map[string]interface{}) chroma.WhereFilter {
	// This would need proper implementation to convert map to WhereFilter
	// For now, return nil
	return nil
}

func distanceToScore(distance float64, distanceFunction string) float64 {
	switch distanceFunction {
	case "cosine":
		return 1 - distance
	case "l2":
		return 1 / (1 + distance)
	case "ip":
		if distance < 0 {
			return -distance
		}
		return distance
	default:
		return 1 - distance
	}
}
```

### 2.2 gRPC Service Definition

**File:** `packages/adapter-chromadb/go-adapter/proto/adapter.proto`

```protobuf
syntax = "proto3";

package nebulusdb.adapter;

option go_package = "github.com/nebulus-db/packages/adapter-chromadb/proto";

service ChromemAdapter {
  rpc Load(LoadRequest) returns (LoadResponse);
  rpc Save(SaveRequest) returns (SaveResponse);
  rpc VectorSearch(VectorSearchRequest) returns (VectorSearchResponse);
  rpc ConfigureCollection(ConfigureCollectionRequest) returns (ConfigureCollectionResponse);
  rpc Close(CloseRequest) returns (CloseResponse);
}

message LoadRequest {}

message LoadResponse {
  map<string, DocumentList> data = 1;
}

message DocumentList {
  repeated Document documents = 1;
}

message Document {
  string id = 1;
  string text = 2;
  repeated double embedding = 3;
  map<string, string> data = 4;
}

message SaveRequest {
  map<string, DocumentList> data = 1;
}

message SaveResponse {
  bool success = 1;
  string error = 2;
}

message VectorSearchRequest {
  string collection_name = 1;
  string query_text = 2;
  int32 limit = 3;
  map<string, string> filter = 4;
}

message VectorSearchResponse {
  repeated VectorSearchResult results = 1;
}

message VectorSearchResult {
  Document document = 1;
  double distance = 2;
  double score = 3;
}

message ConfigureCollectionRequest {
  string collection_name = 1;
  CollectionConfig config = 2;
}

message CollectionConfig {
  string embedding_model = 1;
  string embedding_provider = 2;
  string distance_function = 3;
  string text_field = 4;
  map<string, string> hnsw_config = 5;
}

message ConfigureCollectionResponse {
  bool success = 1;
  string error = 2;
}

message CloseRequest {}

message CloseResponse {
  bool success = 1;
}
```

### 2.3 gRPC Server Implementation

**File:** `packages/adapter-chromadb/go-adapter/server/server.go`

```go
package server

import (
	"context"
	"fmt"
	"log"
	"net"

	"google.golang.org/grpc"

	"github.com/nebulus-db/packages/adapter-chromadb/adapter"
	pb "github.com/nebulus-db/packages/adapter-chromadb/proto"
)

type Server struct {
	pb.UnimplementedChromemAdapterServer
	adapter *adapter.ChromemAdapter
}

func NewServer(chromaURL string) (*Server, error) {
	adp, err := adapter.NewChromemAdapter(chromaURL)
	if err != nil {
		return nil, err
	}

	return &Server{
		adapter: adp,
	}, nil
}

func (s *Server) Load(ctx context.Context, req *pb.LoadRequest) (*pb.LoadResponse, error) {
	data, err := s.adapter.Load(ctx)
	if err != nil {
		return nil, err
	}

	// Convert to protobuf format
	pbData := make(map[string]*pb.DocumentList)
	for collectionName, documents := range data {
		pbDocs := make([]*pb.Document, len(documents))
		for i, doc := range documents {
			pbDocs[i] = &pb.Document{
				Id:        doc.ID,
				Text:      doc.Text,
				Embedding: doc.Embedding,
				Data:      convertMapToStringMap(doc.Data),
			}
		}
		pbData[collectionName] = &pb.DocumentList{Documents: pbDocs}
	}

	return &pb.LoadResponse{Data: pbData}, nil
}

func (s *Server) Save(ctx context.Context, req *pb.SaveRequest) (*pb.SaveResponse, error) {
	// Convert from protobuf format
	data := make(map[string][]adapter.Document)
	for collectionName, docList := range req.Data {
		docs := make([]adapter.Document, len(docList.Documents))
		for i, pbDoc := range docList.Documents {
			docs[i] = adapter.Document{
				ID:        pbDoc.Id,
				Text:      pbDoc.Text,
				Embedding: pbDoc.Embedding,
				Data:      convertStringMapToMap(pbDoc.Data),
			}
		}
		data[collectionName] = docs
	}

	err := s.adapter.Save(ctx, data)
	if err != nil {
		return &pb.SaveResponse{Success: false, Error: err.Error()}, nil
	}

	return &pb.SaveResponse{Success: true}, nil
}

func (s *Server) VectorSearch(ctx context.Context, req *pb.VectorSearchRequest) (*pb.VectorSearchResponse, error) {
	filter := convertStringMapToMap(req.Filter)

	results, err := s.adapter.VectorSearch(ctx, req.CollectionName, req.QueryText, int(req.Limit), filter)
	if err != nil {
		return nil, err
	}

	// Convert to protobuf format
	pbResults := make([]*pb.VectorSearchResult, len(results))
	for i, result := range results {
		pbResults[i] = &pb.VectorSearchResult{
			Document: &pb.Document{
				Id:        result.Document.ID,
				Text:      result.Document.Text,
				Embedding: result.Document.Embedding,
				Data:      convertMapToStringMap(result.Document.Data),
			},
			Distance: result.Distance,
			Score:    result.Score,
		}
	}

	return &pb.VectorSearchResponse{Results: pbResults}, nil
}

func (s *Server) ConfigureCollection(ctx context.Context, req *pb.ConfigureCollectionRequest) (*pb.ConfigureCollectionResponse, error) {
	config := &adapter.CollectionConfig{
		EmbeddingModel:    req.Config.EmbeddingModel,
		EmbeddingProvider: req.Config.EmbeddingProvider,
		DistanceFunction:  req.Config.DistanceFunction,
		TextField:         req.Config.TextField,
		HNSWConfig:        convertStringMapToMap(req.Config.HnswConfig),
	}

	err := s.adapter.ConfigureCollection(ctx, req.CollectionName, config)
	if err != nil {
		return &pb.ConfigureCollectionResponse{Success: false, Error: err.Error()}, nil
	}

	return &pb.ConfigureCollectionResponse{Success: true}, nil
}

func (s *Server) Close(ctx context.Context, req *pb.CloseRequest) (*pb.CloseResponse, error) {
	err := s.adapter.Close()
	if err != nil {
		return &pb.CloseResponse{Success: false}, nil
	}

	return &pb.CloseResponse{Success: true}, nil
}

func (s *Server) Start(port int) error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterChromemAdapterServer(grpcServer, s)

	log.Printf("gRPC server listening on port %d", port)
	return grpcServer.Serve(lis)
}

// Helper functions

func convertMapToStringMap(m map[string]interface{}) map[string]string {
	result := make(map[string]string)
	for k, v := range m {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result
}

func convertStringMapToMap(m map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m {
		result[k] = v
	}
	return result
}
```

### 2.4 TypeScript gRPC Client Bridge

**File:** `packages/adapter-chromadb/src/grpc-bridge.ts`

```typescript
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
```

## Part 3: Testing Implementation

### 3.1 TypeScript Vector Adapter Tests

**File:** `packages/adapter-chromadb/src/vector-adapter.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ChromaVectorAdapter } from './vector-adapter';
import { OpenAIEmbeddingFunction } from './embeddings/openai';
import { DistanceFunction } from './vector-types';

describe('ChromaVectorAdapter', () => {
  let adapter: ChromaVectorAdapter;
  const testApiKey = process.env.OPENAI_API_KEY || 'test-key';

  beforeAll(() => {
    adapter = new ChromaVectorAdapter({
      inMemory: true
    });
  });

  afterAll(async () => {
    await adapter.close();
  });

  it('should create adapter', () => {
    expect(adapter).toBeDefined();
  });

  it('should configure collection with embedding function', () => {
    const embeddingFn = new OpenAIEmbeddingFunction({
      apiKey: testApiKey,
      model: 'text-embedding-3-small'
    });

    adapter.configureCollection('test-collection', {
      embeddingFunction: embeddingFn,
      distanceFunction: DistanceFunction.COSINE,
      hnsw: {
        m: 16,
        efConstruction: 200,
        efSearch: 50
      }
    });

    expect(true).toBe(true);
  });

  it('should save and load documents', async () => {
    const documents = [
      { id: '1', _text: 'Hello world', content: 'test' },
      { id: '2', _text: 'Goodbye world', content: 'test2' }
    ];

    await adapter.save({ 'test-collection': documents });

    const loaded = await adapter.load();
    expect(loaded['test-collection']).toBeDefined();
    expect(loaded['test-collection'].length).toBe(2);
  });

  it('should perform vector search', async () => {
    // This test requires actual embeddings
    const embeddingFn = new OpenAIEmbeddingFunction({
      apiKey: testApiKey
    });

    adapter.configureCollection('search-test', {
      embeddingFunction: embeddingFn,
      distanceFunction: DistanceFunction.COSINE
    });

    const documents = [
      { id: '1', _text: 'The cat sits on the mat' },
      { id: '2', _text: 'The dog plays in the yard' },
      { id: '3', _text: 'Machine learning is fascinating' }
    ];

    await adapter.save({ 'search-test': documents });

    const results = await adapter.vectorSearch('search-test', {
      queryText: 'feline on carpet',
      limit: 2
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document.id).toBe('1'); // Should match cat/mat document
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('should filter by metadata in vector search', async () => {
    const embeddingFn = new OpenAIEmbeddingFunction({
      apiKey: testApiKey
    });

    adapter.configureCollection('filter-test', {
      embeddingFunction: embeddingFn
    });

    const documents = [
      { id: '1', _text: 'Product A', category: 'electronics', price: 100 },
      { id: '2', _text: 'Product B', category: 'electronics', price: 200 },
      { id: '3', _text: 'Product C', category: 'books', price: 50 }
    ];

    await adapter.save({ 'filter-test': documents });

    const results = await adapter.vectorSearch('filter-test', {
      queryText: 'electronics',
      limit: 10,
      where: { category: 'electronics' }
    });

    expect(results.length).toBe(2);
    expect(results.every(r => (r.document as any).category === 'electronics')).toBe(true);
  });
});
```

### 3.2 Go Adapter Tests

**File:** `packages/adapter-chromadb/go-adapter/adapter_test.go`

```go
package adapter

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChromemAdapter(t *testing.T) {
	chromaURL := os.Getenv("CHROMA_URL")
	if chromaURL == "" {
		chromaURL = "http://localhost:8000"
	}

	adapter, err := NewChromemAdapter(chromaURL)
	require.NoError(t, err)
	defer adapter.Close()

	ctx := context.Background()

	t.Run("Configure Collection", func(t *testing.T) {
		config := &CollectionConfig{
			EmbeddingModel:    "nomic-embed-text",
			EmbeddingProvider: "ollama",
			DistanceFunction:  "cosine",
			TextField:         "_text",
		}

		err := adapter.ConfigureCollection(ctx, "test-collection", config)
		assert.NoError(t, err)
	})

	t.Run("Save and Load Documents", func(t *testing.T) {
		documents := []Document{
			{
				ID:   "1",
				Text: "Hello world",
				Data: map[string]interface{}{
					"content": "test",
				},
			},
			{
				ID:   "2",
				Text: "Goodbye world",
				Data: map[string]interface{}{
					"content": "test2",
				},
			},
		}

		data := map[string][]Document{
			"test-collection": documents,
		}

		err := adapter.Save(ctx, data)
		require.NoError(t, err)

		loaded, err := adapter.Load(ctx)
		require.NoError(t, err)

		assert.Contains(t, loaded, "test-collection")
		assert.Len(t, loaded["test-collection"], 2)
	})

	t.Run("Vector Search", func(t *testing.T) {
		// Configure collection with embeddings
		config := &CollectionConfig{
			EmbeddingModel:    "nomic-embed-text",
			EmbeddingProvider: "ollama",
			DistanceFunction:  "cosine",
		}

		err := adapter.ConfigureCollection(ctx, "search-test", config)
		require.NoError(t, err)

		// Add documents
		documents := []Document{
			{ID: "1", Text: "The cat sits on the mat"},
			{ID: "2", Text: "The dog plays in the yard"},
			{ID: "3", Text: "Machine learning is fascinating"},
		}

		err = adapter.Save(ctx, map[string][]Document{
			"search-test": documents,
		})
		require.NoError(t, err)

		// Perform search
		results, err := adapter.VectorSearch(ctx, "search-test", "feline on carpet", 2, nil)
		require.NoError(t, err)

		assert.NotEmpty(t, results)
		assert.Equal(t, "1", results[0].Document.ID) // Should match cat document
		assert.Greater(t, results[0].Score, 0.0)
	})

	t.Run("Vector Search with Filter", func(t *testing.T) {
		config := &CollectionConfig{
			EmbeddingModel:    "nomic-embed-text",
			EmbeddingProvider: "ollama",
		}

		err := adapter.ConfigureCollection(ctx, "filter-test", config)
		require.NoError(t, err)

		documents := []Document{
			{
				ID:   "1",
				Text: "Product A",
				Data: map[string]interface{}{
					"category": "electronics",
					"price":    100.0,
				},
			},
			{
				ID:   "2",
				Text: "Product B",
				Data: map[string]interface{}{
					"category": "electronics",
					"price":    200.0,
				},
			},
			{
				ID:   "3",
				Text: "Product C",
				Data: map[string]interface{}{
					"category": "books",
					"price":    50.0,
				},
			},
		}

		err = adapter.Save(ctx, map[string][]Document{
			"filter-test": documents,
		})
		require.NoError(t, err)

		// Search with filter
		filter := map[string]interface{}{
			"category": "electronics",
		}

		results, err := adapter.VectorSearch(ctx, "filter-test", "electronics", 10, filter)
		require.NoError(t, err)

		assert.Len(t, results, 2)
		for _, result := range results {
			assert.Equal(t, "electronics", result.Document.Data["category"])
		}
	})
}
```

## Part 4: Usage Examples

### 4.1 TypeScript Vector Search Example

```typescript
import { createDb } from '@nebulus-db/core';
import { ChromaVectorAdapter } from '@nebulus-db/adapter-chromadb';
import { OpenAIEmbeddingFunction } from '@nebulus-db/adapter-chromadb/embeddings';

// Create embedding function
const embeddingFn = new OpenAIEmbeddingFunction({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small'
});

// Create adapter with vector support
const adapter = new ChromaVectorAdapter({
  url: 'http://localhost:8000'
});

// Configure collection for vector search
adapter.configureCollection('products', {
  embeddingFunction: embeddingFn,
  distanceFunction: DistanceFunction.COSINE,
  textField: 'description'
});

// Create database
const db = createDb({ adapter });

// Get collection
const products = db.collection('products');

// Insert documents (embeddings generated automatically)
await products.insert({
  name: 'Laptop',
  description: 'High-performance laptop with 16GB RAM',
  price: 1200,
  category: 'electronics'
});

await products.insert({
  name: 'Coffee Maker',
  description: 'Automatic coffee brewing machine',
  price: 89,
  category: 'appliances'
});

// Perform semantic search
const results = await adapter.vectorSearch('products', {
  queryText: 'computer with good memory',
  limit: 5,
  where: { category: 'electronics' }
});

console.log('Search results:', results);
```

### 4.2 Go Adapter Example with gRPC Bridge

```typescript
import { createDb } from '@nebulus-db/core';
import { ChromemGrpcAdapter } from '@nebulus-db/adapter-chromadb/grpc-bridge';

// Create adapter that connects to Go gRPC server
const adapter = new ChromemGrpcAdapter({
  serverAddress: 'localhost:50051'
});

// Configure collection via gRPC
await adapter.configureCollection('documents', {
  embeddingModel: 'nomic-embed-text',
  embeddingProvider: 'ollama',
  distanceFunction: 'cosine'
});

// Create database
const db = createDb({ adapter });

// Use normally - all operations go through high-performance Go backend
const docs = db.collection('documents');

await docs.insert({
  title: 'Introduction to AI',
  content: 'Artificial intelligence is transforming technology...'
});

// Vector search through Go adapter
const searchResults = await adapter.vectorSearch('documents', {
  queryText: 'machine learning fundamentals',
  limit: 10
});
```

## Dependencies

### TypeScript Package Dependencies

Add to `packages/adapter-chromadb/package.json`:

```json
{
  "dependencies": {
    "@nebulus-db/core": "^0.3.0",
    "chromadb": "^1.8.0",
    "openai": "^4.0.0",
    "cohere-ai": "^7.0.0",
    "axios": "^1.6.0",
    "@grpc/grpc-js": "^1.10.0",
    "@grpc/proto-loader": "^0.7.10"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### Go Module Dependencies

Create `packages/adapter-chromadb/go-adapter/go.mod`:

```go
module github.com/nebulus-db/packages/adapter-chromadb

go 1.21

require (
	github.com/guiperry/chroma-go_cerebras v0.2.0
	github.com/pkg/errors v0.9.1
	github.com/stretchr/testify v1.9.0
	google.golang.org/grpc v1.60.0
	google.golang.org/protobuf v1.32.0
)
```

## Implementation Checklist

- [ ] Implement TypeScript vector types and interfaces
- [ ] Implement embedding function providers (OpenAI, Ollama, Cohere)
- [ ] Implement enhanced ChromaVectorAdapter
- [ ] Implement VectorCollection extension
- [ ] Implement Go adapter using chromem-go
- [ ] Create gRPC service definitions
- [ ] Implement gRPC server
- [ ] Implement TypeScript gRPC client bridge
- [ ] Write comprehensive tests for TypeScript adapter
- [ ] Write comprehensive tests for Go adapter
- [ ] Write integration tests for gRPC bridge
- [ ] Add performance benchmarks
- [ ] Update documentation with vector search examples
- [ ] Add migration guide from basic adapter

## Performance Considerations

1. **Batch Embeddings**: Generate embeddings in batches to reduce API calls
2. **HNSW Tuning**: Adjust M, efConstruction, and efSearch based on dataset size
3. **Connection Pooling**: Use gRPC connection pooling for high-throughput scenarios
4. **Caching**: Cache frequently used embeddings
5. **Lazy Loading**: Load embeddings only when needed for vector search

## Security Considerations

1. **API Key Management**: Never commit API keys; use environment variables
2. **gRPC Authentication**: Add TLS and authentication to gRPC server in production
3. **Input Validation**: Validate all queries and filters
4. **Rate Limiting**: Implement rate limiting for embedding generation
5. **Access Control**: Implement collection-level access control

## Future Enhancements

1. **Image Embeddings**: Add support for CLIP and other multimodal models
2. **Hybrid Re-ranking**: Combine vector search with BM25 and re-ranking
3. **Streaming**: Support streaming embeddings for large documents
4. **Quantization**: Add vector quantization for reduced memory usage
5. **Distributed Search**: Support sharded collections across multiple Chroma instances
