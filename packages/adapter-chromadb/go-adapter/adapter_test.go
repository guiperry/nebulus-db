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