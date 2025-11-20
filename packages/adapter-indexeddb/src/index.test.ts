import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { IndexeddbAdapter } from './index';
import 'fake-indexeddb/auto';

describe('IndexeddbAdapter', () => {
  let adapter: IndexeddbAdapter;

  beforeAll(() => {
    // Ensure fake-indexeddb is set up
    if (typeof indexedDB === 'undefined') {
      throw new Error('fake-indexeddb not loaded');
    }
  });

  beforeEach(() => {
    adapter = new IndexeddbAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('should load and save data', async () => {
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