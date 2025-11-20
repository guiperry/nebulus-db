import { Adapter, Document } from '@nebulus-db/core';
import { Client, ClientConfig } from 'pg';

/**
 * Options for PostgresqlAdapter
 */
export interface PostgresqlAdapterOptions extends ClientConfig {
  /** Table name to store documents (default: 'documents') */
  tableName?: string;
}

/**
 * PostgreSQL adapter for NebulusDB
 */
export class PostgresqlAdapter implements Adapter {
  private client: Client;
  private tableName: string;

  /**
   * Create a new PostgresqlAdapter
   * @param options PostgreSQL connection options
   */
  constructor(options: PostgresqlAdapterOptions = {}) {
    const { tableName = 'documents', ...clientConfig } = options;
    this.tableName = tableName;
    this.client = new Client(clientConfig);

    // Initialize database connection and schema
    this.init();
  }

  /**
   * Initialize database connection and create table if needed
   */
  private async init(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          data JSONB NOT NULL,
          PRIMARY KEY (collection, id)
        )
      `);
    } catch (error) {
      console.error('Failed to initialize PostgreSQL database:', error);
      throw error;
    }
  }

  /**
   * Load data from PostgreSQL
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const query = `SELECT collection, data FROM ${this.tableName}`;
      const result = await this.client.query(query);
      const data: Record<string, Document[]> = {};

      for (const row of result.rows) {
        if (!data[row.collection]) {
          data[row.collection] = [];
        }
        try {
          const doc: Document = row.data;
          data[row.collection].push(doc);
        } catch (parseErr) {
          console.error(`Failed to parse document in collection ${row.collection}:`, parseErr);
        }
      }

      return data;
    } catch (error) {
      console.error('Failed to load data from PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Save data to PostgreSQL
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Begin transaction
      await this.client.query('BEGIN');

      // Clear existing data
      await this.client.query(`DELETE FROM ${this.tableName}`);

      // Insert new data
      const insertQuery = `INSERT INTO ${this.tableName} (collection, id, data) VALUES ($1, $2, $3)`;
      for (const [collection, docs] of Object.entries(data)) {
        for (const doc of docs) {
          await this.client.query(insertQuery, [collection, doc.id, JSON.stringify(doc)]);
        }
      }

      // Commit transaction
      await this.client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      console.error('Failed to save data to PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Close the PostgreSQL connection
   */
  async close(): Promise<void> {
    try {
      await this.client.end();
    } catch (error) {
      console.error('Error closing PostgreSQL connection:', error);
    }
  }
}