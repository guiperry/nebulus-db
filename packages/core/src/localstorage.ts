import { Adapter, Document } from './types';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * localstorage adapter for NebulusDB
 */
export class LocalstorageAdapter implements Adapter {
  private filePath: string;

  /**
    * Create a new LocalstorageAdapter
    */
  constructor() {
    const appDataDir = this.getAppDataDir();
    this.filePath = path.join(appDataDir, 'NebulusDB', 'localstorage.json');
  }

  private getAppDataDir(): string {
    const platform = os.platform();
    const home = os.homedir();
    switch (platform) {
      case 'win32':
        return process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
      case 'darwin':
        return path.join(home, 'Library', 'Application Support');
      case 'linux':
        return path.join(home, '.local', 'share');
      default:
        return path.join(home, '.nebulusdb');
    }
  }

  /**
    * Load data from localstorage
    */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as Record<string, Document[]>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      console.error('Failed to load data from localstorage:', error);
      throw error;
    }
  }

  /**
    * Save data to localstorage
    */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(this.filePath, json, 'utf-8');
    } catch (error) {
      console.error('Failed to save data to localstorage:', error);
      throw error;
    }
  }

  /**
   * Close the localstorage connection
   */
  async close(): Promise<void> {
    // Implement closing connection if needed
  }
}