import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createDb, Database } from '@nebulus-db/core';
import { IndexedDBAdapter } from '@nebulus-db/adapter-indexeddb';

// Create context
interface NebulusContextType {
  db: Database | null;
  loading: boolean;
  error: Error | null;
}

const NebulusContext = createContext<NebulusContextType>({
  db: null,
  loading: true,
  error: null
});

// Provider component
interface NebulusProviderProps {
  children: ReactNode;
}

export function NebulusProvider({ children }: NebulusProviderProps) {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initDatabase() {
      try {
        // Create database with IndexedDB adapter
        const database = createDb({
          adapter: new IndexedDBAdapter('nebulus-react-example', 'collections', 1)
        }) as Database;

        // Initialize collections
        database.collection('tasks');
        
        // Save initial state
        await database.save();
        
        setDb(database);
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setLoading(false);
      }
    }

    initDatabase();

    // Cleanup function
    return () => {
      // Nothing to clean up for now
    };
  }, []);

  return (
    <NebulusContext.Provider value={{ db, loading, error }}>
      {children}
    </NebulusContext.Provider>
  );
}

// Custom hook to use the context
export function useNebulusDb() {
  const context = useContext(NebulusContext);
  
  if (context === undefined) {
    throw new Error('useNebulusDb must be used within a NebulusProvider');
  }
  
  return context;
}
