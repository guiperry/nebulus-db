import type { PeerId } from '@libp2p/interface-peer-id';
import type { Multiaddr } from '@multiformats/multiaddr';
import { Document } from '../types';

/**
 * Vector clock for tracking document versions across peers
 */
export interface VectorClock {
  [peerId: string]: number;
}

/**
 * Document with distributed metadata
 */
export interface DistributedDocument extends Document {
  _vector: VectorClock;
  _timestamp: number;
  _peerId: string;
  _deleted?: boolean;
}

/**
 * Operation types for CRDT
 */
export enum OperationType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete'
}

/**
 * CRDT operation for synchronization
 */
export interface CRDTOperation {
  id: string;
  type: OperationType;
  collection: string;
  documentId: string | number;
  data: Partial<DistributedDocument>;
  vector: VectorClock;
  timestamp: number;
  peerId: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  networkId: string;
  name: string;
  collections: Set<string>;
  bootstrapPeers: Multiaddr[];
  encryption: {
    enabled: boolean;
    sharedSecret?: string;
  };
  replication: {
    factor: number;
    strategy: 'full' | 'partial' | 'leader';
  };
  discovery: {
    mdns: boolean;
    bootstrap: boolean;
  };
}

/**
 * Peer information
 */
export interface PeerInfo {
  peerId: string;
  addresses: Multiaddr[];
  protocols: string[];
  latency?: number;
  lastSeen: number;
  collections: string[];
}

/**
 * Sync state for a collection
 */
export interface SyncState {
  collection: string;
  networkId: string;
  localVector: VectorClock;
  lastSync: number;
  pendingOperations: CRDTOperation[];
  syncInProgress: boolean;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  networkId: string;
  connectedPeers: number;
  totalPeers: number;
  collectionsShared: number;
  operationsSent: number;
  operationsReceived: number;
  bytesTransferred: number;
  averageLatency: number;
}

/**
 * Message types for peer communication
 */
export enum MessageType {
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response',
  OPERATION = 'operation',
  HEARTBEAT = 'heartbeat',
  COLLECTION_ANNOUNCE = 'collection_announce',
  COLLECTION_REQUEST = 'collection_request'
}

/**
 * Protocol message
 */
export interface ProtocolMessage {
  type: MessageType;
  networkId: string;
  senderId: string;
  timestamp: number;
  payload: any;
}