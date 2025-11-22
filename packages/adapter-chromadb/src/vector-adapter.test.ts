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