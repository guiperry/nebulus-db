import { describe, it, expect } from 'vitest';
import { CRDTResolver } from '../crdt-resolver';
import { DistributedDocument, CRDTOperation, OperationType } from '../types';
import { VectorClockManager } from '../vector-clock';

describe('CRDTResolver', () => {
  it('should convert document to distributed document', () => {
    const doc = { id: '1', name: 'Test', age: 30 };
    const peerId = 'peer1';

    const distDoc = CRDTResolver.toDistributedDocument(doc, peerId);

    expect(distDoc.id).toBe('1');
    expect(distDoc.name).toBe('Test');
    expect(distDoc.age).toBe(30);
    expect(distDoc._peerId).toBe(peerId);
    expect(distDoc._vector).toEqual({ peer1: 1 });
    expect(distDoc._timestamp).toBeGreaterThan(0);
  });

  it('should convert distributed document to regular document', () => {
    const distDoc: DistributedDocument = {
      id: '1',
      name: 'Test',
      _vector: { peer1: 5 },
      _timestamp: Date.now(),
      _peerId: 'peer1'
    };

    const doc = CRDTResolver.toRegularDocument(distDoc);

    expect(doc.id).toBe('1');
    expect(doc.name).toBe('Test');
    expect('_vector' in doc).toBe(false);
    expect('_timestamp' in doc).toBe(false);
    expect('_peerId' in doc).toBe(false);
  });

  it('should resolve conflict with clear winner (after)', () => {
    const local: DistributedDocument = {
      id: '1',
      name: 'Local',
      _vector: { peer1: 2 },
      _timestamp: Date.now(),
      _peerId: 'peer1'
    };

    const remote: DistributedDocument = {
      id: '1',
      name: 'Remote',
      _vector: { peer1: 1 },
      _timestamp: Date.now() - 1000,
      _peerId: 'peer2'
    };

    const result = CRDTResolver.resolveConflict(local, remote);
    expect(result.name).toBe('Local');
  });

  it('should resolve conflict with clear winner (before)', () => {
    const local: DistributedDocument = {
      id: '1',
      name: 'Local',
      _vector: { peer1: 1 },
      _timestamp: Date.now() - 1000,
      _peerId: 'peer1'
    };

    const remote: DistributedDocument = {
      id: '1',
      name: 'Remote',
      _vector: { peer1: 2 },
      _timestamp: Date.now(),
      _peerId: 'peer2'
    };

    const result = CRDTResolver.resolveConflict(local, remote);
    expect(result.name).toBe('Remote');
  });

  it('should resolve concurrent conflicts using timestamp', () => {
    const timestamp1 = Date.now();
    const timestamp2 = timestamp1 + 1000;

    const local: DistributedDocument = {
      id: '1',
      name: 'Local',
      _vector: { peer1: 1 },
      _timestamp: timestamp2,
      _peerId: 'peer1'
    };

    const remote: DistributedDocument = {
      id: '1',
      name: 'Remote',
      _vector: { peer2: 1 },
      _timestamp: timestamp1,
      _peerId: 'peer2'
    };

    const result = CRDTResolver.resolveConflict(local, remote);
    expect(result.name).toBe('Local');
    expect(result._vector).toEqual({ peer1: 1, peer2: 1 });
  });

  it('should apply insert operation', () => {
    const operation: CRDTOperation = {
      id: 'op1',
      type: OperationType.INSERT,
      collection: 'users',
      documentId: '1',
      data: {
        id: '1',
        name: 'New User',
        _vector: { peer1: 1 },
        _timestamp: Date.now(),
        _peerId: 'peer1'
      },
      vector: { peer1: 1 },
      timestamp: Date.now(),
      peerId: 'peer1'
    };

    const result = CRDTResolver.applyOperation(null, operation);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('New User');
  });

  it('should apply update operation', () => {
    const existing: DistributedDocument = {
      id: '1',
      name: 'Old Name',
      age: 25,
      _vector: { peer1: 1 },
      _timestamp: Date.now() - 1000,
      _peerId: 'peer1'
    };

    const operation: CRDTOperation = {
      id: 'op2',
      type: OperationType.UPDATE,
      collection: 'users',
      documentId: '1',
      data: {
        id: '1',
        name: 'New Name',
        _vector: { peer1: 2 },
        _timestamp: Date.now(),
        _peerId: 'peer1'
      },
      vector: { peer1: 2 },
      timestamp: Date.now(),
      peerId: 'peer1'
    };

    const result = CRDTResolver.applyOperation(existing, operation);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('New Name');
    expect(result!.age).toBe(25);
  });

  it('should apply delete operation', () => {
    const existing: DistributedDocument = {
      id: '1',
      name: 'To Delete',
      _vector: { peer1: 1 },
      _timestamp: Date.now() - 1000,
      _peerId: 'peer1'
    };

    const operation: CRDTOperation = {
      id: 'op3',
      type: OperationType.DELETE,
      collection: 'users',
      documentId: '1',
      data: {
        id: '1',
        _deleted: true,
        _vector: { peer1: 2 },
        _timestamp: Date.now(),
        _peerId: 'peer1'
      },
      vector: { peer1: 2 },
      timestamp: Date.now(),
      peerId: 'peer1'
    };

    const result = CRDTResolver.applyOperation(existing, operation);

    expect(result).not.toBeNull();
    expect(result!._deleted).toBe(true);
  });

  it('should ignore stale operations', () => {
    const existing: DistributedDocument = {
      id: '1',
      name: 'Current',
      _vector: { peer1: 5 },
      _timestamp: Date.now(),
      _peerId: 'peer1'
    };

    const operation: CRDTOperation = {
      id: 'op4',
      type: OperationType.UPDATE,
      collection: 'users',
      documentId: '1',
      data: {
        id: '1',
        name: 'Stale',
        _vector: { peer1: 3 },
        _timestamp: Date.now() - 5000,
        _peerId: 'peer1'
      },
      vector: { peer1: 3 },
      timestamp: Date.now() - 5000,
      peerId: 'peer1'
    };

    const result = CRDTResolver.applyOperation(existing, operation);

    expect(result!.name).toBe('Current');
  });

  it('should handle deleted document conflicts', () => {
    const local: DistributedDocument = {
      id: '1',
      name: 'Active',
      _vector: { peer1: 1 },
      _timestamp: Date.now() - 1000,
      _peerId: 'peer1'
    };

    const remote: DistributedDocument = {
      id: '1',
      _deleted: true,
      _vector: { peer2: 1 },
      _timestamp: Date.now(),
      _peerId: 'peer2'
    };

    const result = CRDTResolver.resolveConflict(local, remote);
    expect(result._deleted).toBe(true);
  });
});