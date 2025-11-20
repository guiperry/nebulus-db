import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryAdapter } from './index';

// Mock the redis module
vi.mock('redis', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    SMEMBERS: vi.fn(),
    DEL: vi.fn(),
    SADD: vi.fn(),
    HGETALL: vi.fn(),
    HSET: vi.fn(),
  };

  return {
    createClient: vi.fn(() => mockClient),
  };
});

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter({
      host: 'localhost',
      port: 6379,
    });
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('should load and save data', async () => {
    // Mock the Redis methods
    const { createClient } = await import('redis');
    const mockClient = createClient() as any;

    // Mock save operations
    mockClient.SMEMBERS.mockResolvedValue([]);
    mockClient.SADD.mockResolvedValue(1);
    mockClient.HSET.mockResolvedValue(1);

    // Mock load operations
    mockClient.SMEMBERS.mockResolvedValue(['users']);
    mockClient.HGETALL.mockResolvedValue({
      '1': JSON.stringify({ id: '1', name: 'Alice' }),
      '2': JSON.stringify({ id: '2', name: 'Bob' }),
    });

    const testData = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ]
    };

    await adapter.save(testData);
    const loadedData = await adapter.load();

    expect(loadedData).toEqual(testData);
  });
});