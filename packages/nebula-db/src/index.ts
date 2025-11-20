/**
 * NebulusDB - Fast, flexible, serverless embedded NoSQL database
 *
 * This is the main entry point for NebulusDB. It provides environment-aware database creation
 * that automatically chooses the appropriate adapter for browser or Node.js environments.
 */

// Lazy initialization to avoid SSR issues
let _createDatabase: any = null;

/**
 * Create a database with environment-specific adapters
 */
export async function createDatabase(config: any) {
  if (_createDatabase === null) {
    // Dynamic import based on environment
    if (typeof window !== 'undefined') {
      // Browser environment
      const { createBrowserDatabase } = await import('@nebulus-db/core/browser-adapter');
      _createDatabase = createBrowserDatabase;
    } else {
      // Node.js environment
      const { createNodeDatabase } = await import('@nebulus-db/core/node-adapter');
      _createDatabase = createNodeDatabase;
    }
  }

  return _createDatabase(config);
}

// Default export for convenience
export default {
  createDatabase
};
