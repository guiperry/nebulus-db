import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { FilesystemAdapter } from './index';

describe('FilesystemAdapter', () => {
  let adapter: FilesystemAdapter;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nebulusdb-test-'));
    adapter = new FilesystemAdapter({ path: tempDir });
  });

  afterEach(async () => {
    await adapter.close();
    // Clean up temp directory
    try {
      const files = await fs.readdir(tempDir);
      await Promise.all(files.map(file => fs.unlink(path.join(tempDir, file))));
      await fs.rmdir(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should load and save data', async () => {
    const testData = {
      users: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ],
      posts: [
        { id: '1', title: 'Hello World', content: 'Test post' }
      ]
    };

    await adapter.save(testData);
    const loadedData = await adapter.load();

    expect(loadedData).toEqual(testData);
  });

  it('should handle empty data', async () => {
    const testData: Record<string, any[]> = {};

    await adapter.save(testData);
    const loadedData = await adapter.load();

    expect(loadedData).toEqual(testData);
  });

});