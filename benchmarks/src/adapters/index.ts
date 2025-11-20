import { NebulusAdapter } from './nebulus';
import { NebulusWasmAdapter } from './nebulus-wasm';
import { RxDBAdapter } from './rxdb';
import { PouchDBAdapter } from './pouchdb';
import { DatabaseAdapter } from '../types';

/**
 * Get all database adapters
 */
export function getAdapters(): DatabaseAdapter[] {
  return [
    new NebulusAdapter(),
    new NebulusWasmAdapter(),
    new RxDBAdapter(),
    new PouchDBAdapter()
  ];
}

export { NebulusAdapter, NebulusWasmAdapter, RxDBAdapter, PouchDBAdapter };
