import FSDB from 'file-system-db';
import { Adapter, Document } from '@nebulus-db/core';

/**
 * Options for FilesystemAdapter
 */
export interface FilesystemAdapterOptions {
  /** Path to the database file */
  path: string;
  /** Whether to compact the JSON (default: true) */
  compact?: boolean;
}

/**
 * filesystem adapter for NebulusDB using file-system-db
 */
export class FilesystemAdapter implements Adapter {
  private db: FSDB;

  /**
   * Create a new FilesystemAdapter
   * @param options Configuration options
   */
  constructor(options: FilesystemAdapterOptions) {
    this.db = new FSDB(options.path, options.compact ?? true);
  }

  /**
   * Load data from filesystem
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const data = this.db.get('data') || {};
      return data;
    } catch (error) {
      console.error('Failed to load data from filesystem:', error);
      return {};
    }
  }

  /**
   * Save data to filesystem
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      this.db.set('data', data);
    } catch (error) {
      console.error('Failed to save data to filesystem:', error);
      throw error;
    }
  }

  /**
   * Close the filesystem connection
   */
  async close(): Promise<void> {
    // file-system-db doesn't require explicit closing
  }
}