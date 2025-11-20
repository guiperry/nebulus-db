import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from './index';
import * as fs from 'fs';
import * as path from 'path';

describe('SqliteAdapter', () => {
  let adapter: SqliteAdapter;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(__dirname, 'test.db');
    adapter = new SqliteAdapter({ filename: dbPath });
  });

  afterEach(async () => {
    await adapter.close();
    // Clean up test database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
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