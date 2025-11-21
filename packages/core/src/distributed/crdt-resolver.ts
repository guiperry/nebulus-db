import { DistributedDocument, CRDTOperation, OperationType, VectorClock } from './types';
import { VectorClockManager } from './vector-clock';
import { Document } from '../types';

export class CRDTResolver {
  /**
   * Resolve conflicts between two document versions
   * Uses Last-Write-Wins (LWW) with vector clock tie-breaking
   */
  static resolveConflict(local: DistributedDocument, remote: DistributedDocument): DistributedDocument {
    // Handle deletion
    if (remote._deleted && !local._deleted) {
      const comparison = VectorClockManager.compare(local._vector, remote._vector);
      if (comparison === 'before' || comparison === 'concurrent') {
        return remote;
      }
      return local;
    }

    if (local._deleted && !remote._deleted) {
      const comparison = VectorClockManager.compare(remote._vector, local._vector);
      if (comparison === 'before' || comparison === 'concurrent') {
        return local;
      }
      return remote;
    }

    const comparison = VectorClockManager.compare(local._vector, remote._vector);

    switch (comparison) {
      case 'after':
        return local;
      case 'before':
        return remote;
      case 'equal':
        return local; // Already in sync
      case 'concurrent':
        // Use timestamp and peer ID for deterministic resolution
        if (local._timestamp > remote._timestamp) {
          return this.mergeDocuments(local, remote);
        } else if (local._timestamp < remote._timestamp) {
          return this.mergeDocuments(remote, local);
        } else {
          // Same timestamp - use peer ID for deterministic ordering
          return local._peerId > remote._peerId
            ? this.mergeDocuments(local, remote)
            : this.mergeDocuments(remote, local);
        }
    }
  }

  /**
   * Merge two documents (winner wins, but preserve concurrent field updates)
   */
  private static mergeDocuments(winner: DistributedDocument, loser: DistributedDocument): DistributedDocument {
    const merged: DistributedDocument = { ...winner };
    merged._vector = VectorClockManager.merge(winner._vector, loser._vector);

    // Merge fields that don't conflict
    for (const key in loser) {
      if (key.startsWith('_')) continue; // Skip metadata
      if (!(key in winner)) {
        merged[key] = loser[key];
      }
    }

    return merged;
  }

  /**
   * Apply an operation to a document
   */
  static applyOperation(doc: DistributedDocument | null, op: CRDTOperation): DistributedDocument | null {
    switch (op.type) {
      case OperationType.INSERT:
      case OperationType.UPDATE:
        if (!doc) {
          return {
            ...op.data as DistributedDocument,
            _vector: op.vector,
            _timestamp: op.timestamp,
            _peerId: op.peerId
          };
        }

        const comparison = VectorClockManager.compare(doc._vector, op.vector);
        if (comparison === 'before' || comparison === 'concurrent') {
          const updated = { ...doc, ...op.data };
          updated._vector = VectorClockManager.merge(doc._vector, op.vector);
          updated._timestamp = Math.max(doc._timestamp, op.timestamp);
          return updated;
        }
        return doc;

      case OperationType.DELETE:
        if (!doc) return null;

        const delComparison = VectorClockManager.compare(doc._vector, op.vector);
        if (delComparison === 'before' || delComparison === 'concurrent') {
          return {
            ...doc,
            _deleted: true,
            _vector: VectorClockManager.merge(doc._vector, op.vector),
            _timestamp: Math.max(doc._timestamp, op.timestamp)
          };
        }
        return doc;

      default:
        return doc;
    }
  }

  /**
   * Convert a regular document to a distributed document
   */
  static toDistributedDocument(doc: Document, peerId: string): DistributedDocument {
    const vector = VectorClockManager.create();
    vector[peerId] = 1;

    return {
      ...doc,
      _vector: vector,
      _timestamp: Date.now(),
      _peerId: peerId
    };
  }

  /**
   * Convert a distributed document back to a regular document
   */
  static toRegularDocument(doc: DistributedDocument): Document {
    const { _vector, _timestamp, _peerId, _deleted, ...regularDoc } = doc;
    return regularDoc;
  }
}