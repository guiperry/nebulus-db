import { VectorClock } from './types';

export class VectorClockManager {
  /**
   * Increment the clock for a specific peer
   */
  static increment(clock: VectorClock, peerId: string): VectorClock {
    return {
      ...clock,
      [peerId]: (clock[peerId] || 0) + 1
    };
  }

  /**
   * Merge two vector clocks (take maximum of each component)
   */
  static merge(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const allPeers = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    const merged: VectorClock = {};

    for (const peerId of allPeers) {
      merged[peerId] = Math.max(clock1[peerId] || 0, clock2[peerId] || 0);
    }

    return merged;
  }

  /**
   * Compare two vector clocks
   * Returns: 'before' | 'after' | 'concurrent' | 'equal'
   */
  static compare(clock1: VectorClock, clock2: VectorClock): 'before' | 'after' | 'concurrent' | 'equal' {
    const allPeers = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);

    let hasGreater = false;
    let hasLess = false;

    for (const peerId of allPeers) {
      const val1 = clock1[peerId] || 0;
      const val2 = clock2[peerId] || 0;

      if (val1 > val2) hasGreater = true;
      if (val1 < val2) hasLess = true;
    }

    if (!hasGreater && !hasLess) return 'equal';
    if (hasGreater && !hasLess) return 'after';
    if (hasLess && !hasGreater) return 'before';
    return 'concurrent';
  }

  /**
   * Check if clock1 is causally before clock2
   */
  static happensBefore(clock1: VectorClock, clock2: VectorClock): boolean {
    const comparison = this.compare(clock1, clock2);
    return comparison === 'before' || comparison === 'equal';
  }

  /**
   * Create a new empty vector clock
   */
  static create(): VectorClock {
    return {};
  }

  /**
   * Clone a vector clock
   */
  static clone(clock: VectorClock): VectorClock {
    return { ...clock };
  }
}