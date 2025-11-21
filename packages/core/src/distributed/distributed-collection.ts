import { Collection } from '../collection';
import {
  Document,
  Query,
  UpdateOperation,
  CollectionOptions
} from '../types';
import {
  DistributedDocument,
  CRDTOperation,
  OperationType,
  SyncState,
  MessageType,
  ProtocolMessage
} from './types';
import { NetworkManager } from './network-manager';
import { CRDTResolver } from './crdt-resolver';
import { VectorClockManager } from './vector-clock';

export class DistributedCollection extends Collection {
  private networkManager: NetworkManager;
  private networkId: string | null = null;
  private syncStates: Map<string, SyncState> = new Map();
  private operationLog: CRDTOperation[] = [];
  private maxLogSize = 10000;

  constructor(
    name: string,
    networkManager: NetworkManager,
    initialDocs: Document[] = [],
    options: CollectionOptions = {},
    plugins: any[] = []
  ) {
    super(name, initialDocs, options, plugins);
    this.networkManager = networkManager;

    // Register message handlers
    this.setupMessageHandlers();
  }

  /**
   * Attach this collection to a network
   */
  async attachToNetwork(networkId: string): Promise<void> {
    if (this.networkId) {
      throw new Error(`Collection ${this.name} is already attached to network ${this.networkId}`);
    }

    this.networkId = networkId;
    await this.networkManager.addCollectionToNetwork(networkId, this.name);

    // Initialize sync state
    const syncState: SyncState = {
      collection: this.name,
      networkId,
      localVector: VectorClockManager.create(),
      lastSync: Date.now(),
      pendingOperations: [],
      syncInProgress: false
    };
    this.syncStates.set(networkId, syncState);

    // Request initial sync
    await this.requestSync();
  }

  /**
   * Detach this collection from its network
   */
  async detachFromNetwork(): Promise<void> {
    if (!this.networkId) return;

    await this.networkManager.removeCollectionFromNetwork(this.networkId, this.name);
    this.syncStates.delete(this.networkId);
    this.networkId = null;
  }

  /**
   * Insert with distributed synchronization
   */
  async insert(doc: Omit<Document, 'id'> & { id?: string }): Promise<Document> {
    const inserted = await super.insert(doc);

    if (this.networkId) {
      await this.broadcastOperation({
        id: `${this.networkManager.getPeerId()}-${Date.now()}-${Math.random()}`,
        type: OperationType.INSERT,
        collection: this.name,
        documentId: inserted.id,
        data: this.toDistributed(inserted),
        vector: this.getCurrentVector(),
        timestamp: Date.now(),
        peerId: this.networkManager.getPeerId()
      });
    }

    return inserted;
  }

  /**
   * Update with distributed synchronization
   */
  async update(query: Query, update: UpdateOperation): Promise<number> {
    const affected = await super.update(query, update);

    if (this.networkId && affected > 0) {
      const docs = await super.find(query);

      for (const doc of docs) {
        await this.broadcastOperation({
          id: `${this.networkManager.getPeerId()}-${Date.now()}-${Math.random()}`,
          type: OperationType.UPDATE,
          collection: this.name,
          documentId: doc.id,
          data: this.toDistributed(doc),
          vector: this.getCurrentVector(),
          timestamp: Date.now(),
          peerId: this.networkManager.getPeerId()
        });
      }
    }

    return affected;
  }

  /**
   * Delete with distributed synchronization
   */
  async delete(query: Query): Promise<number> {
    const docsToDelete = await super.find(query);
    const deleted = await super.delete(query);

    if (this.networkId && deleted > 0) {
      for (const doc of docsToDelete) {
        await this.broadcastOperation({
          id: `${this.networkManager.getPeerId()}-${Date.now()}-${Math.random()}`,
          type: OperationType.DELETE,
          collection: this.name,
          documentId: doc.id,
          data: { ...this.toDistributed(doc), _deleted: true },
          vector: this.getCurrentVector(),
          timestamp: Date.now(),
          peerId: this.networkManager.getPeerId()
        });
      }
    }

    return deleted;
  }

  /**
   * Get sync state for the current network
   */
  getSyncState(): SyncState | null {
    if (!this.networkId) return null;
    return this.syncStates.get(this.networkId) || null;
  }

  /**
   * Force synchronization with peers
   */
  async forceSync(): Promise<void> {
    if (!this.networkId) return;
    await this.requestSync();
  }

  // Private methods

  private setupMessageHandlers(): void {
    this.networkManager.onMessage(MessageType.OPERATION, async (msg) => {
      if (msg.payload.collection === this.name) {
        await this.handleRemoteOperation(msg.payload.operation);
      }
    });

    this.networkManager.onMessage(MessageType.SYNC_REQUEST, async (msg) => {
      if (msg.payload.collection === this.name) {
        await this.handleSyncRequest(msg);
      }
    });

    this.networkManager.onMessage(MessageType.SYNC_RESPONSE, async (msg) => {
      if (msg.payload.collection === this.name) {
        await this.handleSyncResponse(msg);
      }
    });
  }

  private async broadcastOperation(operation: CRDTOperation): Promise<void> {
    if (!this.networkId) return;

    // Add to operation log
    this.operationLog.push(operation);
    this.pruneOperationLog();

    // Update local vector clock
    const syncState = this.syncStates.get(this.networkId)!;
    syncState.localVector = VectorClockManager.increment(
      syncState.localVector,
      this.networkManager.getPeerId()
    );

    // Broadcast to network
    await this.networkManager.broadcastMessage(this.networkId, {
      type: MessageType.OPERATION,
      networkId: this.networkId,
      senderId: this.networkManager.getPeerId(),
      timestamp: Date.now(),
      payload: { collection: this.name, operation }
    });
  }

  private async handleRemoteOperation(operation: CRDTOperation): Promise<void> {
    // Find existing document
    const docs = await super.find({ id: operation.documentId });
    const existingDoc = docs[0] || null;

    // Apply CRDT operation
    const distributedDoc = existingDoc ? this.toDistributed(existingDoc) : null;
    const result = CRDTResolver.applyOperation(distributedDoc, operation);

    if (result === null) {
      // Document was deleted
      if (existingDoc) {
        await super.delete({ id: operation.documentId });
      }
    } else if (result._deleted) {
      // Mark as deleted
      await super.delete({ id: operation.documentId });
    } else {
      // Update or insert document
      const regularDoc = CRDTResolver.toRegularDocument(result);

      if (existingDoc) {
        await super.update({ id: operation.documentId }, { $set: regularDoc });
      } else {
        await super.insert({ ...regularDoc, id: String(regularDoc.id) });
      }
    }

    // Update vector clock
    if (this.networkId) {
      const syncState = this.syncStates.get(this.networkId)!;
      syncState.localVector = VectorClockManager.merge(
        syncState.localVector,
        operation.vector
      );
    }
  }

  private async requestSync(): Promise<void> {
    if (!this.networkId) return;

    const syncState = this.syncStates.get(this.networkId)!;
    if (syncState.syncInProgress) return;

    syncState.syncInProgress = true;

    await this.networkManager.broadcastMessage(this.networkId, {
      type: MessageType.SYNC_REQUEST,
      networkId: this.networkId,
      senderId: this.networkManager.getPeerId(),
      timestamp: Date.now(),
      payload: {
        collection: this.name,
        vector: syncState.localVector
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      syncState.syncInProgress = false;
    }, 10000);
  }

  private async handleSyncRequest(msg: ProtocolMessage): Promise<void> {
    if (!this.networkId) return;

    const remoteVector = msg.payload.vector;
    const localVector = this.syncStates.get(this.networkId)!.localVector;

    // Find operations that remote peer doesn't have
    const missingOps = this.operationLog.filter(op => {
      const remoteClock = remoteVector[op.peerId] || 0;
      const opClock = op.vector[op.peerId] || 0;
      return opClock > remoteClock;
    });

    // Send response
    await this.networkManager.sendToPeer(msg.senderId, this.networkId, {
      type: MessageType.SYNC_RESPONSE,
      networkId: this.networkId,
      senderId: this.networkManager.getPeerId(),
      timestamp: Date.now(),
      payload: {
        collection: this.name,
        operations: missingOps,
        vector: localVector
      }
    });
  }

  private async handleSyncResponse(msg: ProtocolMessage): Promise<void> {
    if (!this.networkId) return;

    const operations: CRDTOperation[] = msg.payload.operations;

    // Apply operations in order
    for (const op of operations) {
      await this.handleRemoteOperation(op);
    }

    const syncState = this.syncStates.get(this.networkId)!;
    syncState.syncInProgress = false;
    syncState.lastSync = Date.now();
  }

  private toDistributed(doc: Document): DistributedDocument {
    return CRDTResolver.toDistributedDocument(doc, this.networkManager.getPeerId());
  }

  private getCurrentVector(): import('./types').VectorClock {
    if (!this.networkId) return VectorClockManager.create();

    const syncState = this.syncStates.get(this.networkId);
    return syncState ? syncState.localVector : VectorClockManager.create();
  }

  private pruneOperationLog(): void {
    if (this.operationLog.length > this.maxLogSize) {
      // Keep only the most recent operations
      this.operationLog = this.operationLog.slice(-this.maxLogSize);
    }
  }
}