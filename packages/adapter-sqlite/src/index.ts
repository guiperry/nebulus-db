import * as sqlite3 from 'sqlite3';
import { Adapter, Document } from '@nebulus-db/core';

/**
 * Options for SqliteAdapter
 */
export interface SqliteAdapterOptions {
  /** Path to the SQLite database file */
  filename: string;
  /** SQLite mode (default: OPEN_READWRITE | OPEN_CREATE) */
  mode?: number;
}

/**
 * SQLite adapter for NebulusDB
 */
export class SqliteAdapter implements Adapter {
  private db: sqlite3.Database;

  /**
   * Create a new SqliteAdapter
   * @param options Configuration options
   */
  constructor(options: SqliteAdapterOptions) {
    const mode = options.mode ?? (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
    this.db = new sqlite3.Database(options.filename, mode);

    // Initialize database schema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      )
    `);
  }

  /**
   * Load data from SQLite
   */
  async load(): Promise<Record<string, Document[]>> {
    return new Promise((resolve, reject) => {
      const query = 'SELECT collection, data FROM documents';
      this.db.all(query, [], (err: Error | null, rows: { collection: string; data: string }[]) => {
        if (err) {
          console.error('Failed to load data from SQLite:', err);
          reject(err);
          return;
        }

        const result: Record<string, Document[]> = {};
        for (const row of rows) {
          if (!result[row.collection]) {
            result[row.collection] = [];
          }
          try {
            const doc: Document = JSON.parse(row.data);
            result[row.collection].push(doc);
          } catch (parseErr) {
            console.error(`Failed to parse document in collection ${row.collection}:`, parseErr);
          }
        }
        resolve(result);
      });
    });
  }

  /**
   * Save data to SQLite
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Begin transaction
      this.db.run('BEGIN TRANSACTION', (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        // Clear existing data
        this.db.run('DELETE FROM documents', (err: Error | null) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Insert new data
          const stmt = this.db.prepare('INSERT INTO documents (collection, id, data) VALUES (?, ?, ?)');
          let hasError = false;

          for (const [collection, docs] of Object.entries(data)) {
            for (const doc of docs) {
              const dataJson = JSON.stringify(doc);
              stmt.run([collection, doc.id, dataJson], (err: Error | null) => {
                if (err && !hasError) {
                  hasError = true;
                  this.db.run('ROLLBACK');
                  reject(err);
                }
              });
            }
          }

          stmt.finalize((err: Error | null) => {
            if (err && !hasError) {
              hasError = true;
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (!hasError) {
              this.db.run('COMMIT', (err: Error | null) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        });
      });
    });
  }

  /**
   * Close the SQLite connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.db.close((err: Error | null) => {
        if (err) {
          console.error('Error closing SQLite database:', err);
        }
        resolve();
      });
    });
  }
}