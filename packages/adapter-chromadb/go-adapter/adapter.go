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