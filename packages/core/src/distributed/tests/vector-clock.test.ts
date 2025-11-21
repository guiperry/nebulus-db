import { describe, it, expect } from 'vitest';
import { VectorClockManager } from '../vector-clock';

describe('VectorClockManager', () => {
  it('should create an empty vector clock', () => {
    const clock = VectorClockManager.create();
    expect(clock).toEqual({});
  });

  it('should increment a peer clock', () => {
    let clock = VectorClockManager.create();
    clock = VectorClockManager.increment(clock, 'peer1');

    expect(clock).toEqual({ peer1: 1 });

    clock = VectorClockManager.increment(clock, 'peer1');
    expect(clock).toEqual({ peer1: 2 });
  });

  it('should merge two vector clocks', () => {
    const clock1 = { peer1: 3, peer2: 1 };
    const clock2 = { peer1: 2, peer2: 4, peer3: 1 };

    const merged = VectorClockManager.merge(clock1, clock2);

    expect(merged).toEqual({ peer1: 3, peer2: 4, peer3: 1 });
  });

  it('should compare equal clocks', () => {
    const clock1 = { peer1: 1, peer2: 2 };
    const clock2 = { peer1: 1, peer2: 2 };

    const result = VectorClockManager.compare(clock1, clock2);
    expect(result).toBe('equal');
  });

  it('should detect before relationship', () => {
    const clock1 = { peer1: 1, peer2: 1 };
    const clock2 = { peer1: 2, peer2: 2 };

    const result = VectorClockManager.compare(clock1, clock2);
    expect(result).toBe('before');
  });

  it('should detect after relationship', () => {
    const clock1 = { peer1: 3, peer2: 3 };
    const clock2 = { peer1: 2, peer2: 2 };

    const result = VectorClockManager.compare(clock1, clock2);
    expect(result).toBe('after');
  });

  it('should detect concurrent updates', () => {
    const clock1 = { peer1: 2, peer2: 1 };
    const clock2 = { peer1: 1, peer2: 2 };

    const result = VectorClockManager.compare(clock1, clock2);
    expect(result).toBe('concurrent');
  });

  it('should check happens-before relationship', () => {
    const clock1 = { peer1: 1, peer2: 1 };
    const clock2 = { peer1: 2, peer2: 2 };

    expect(VectorClockManager.happensBefore(clock1, clock2)).toBe(true);
    expect(VectorClockManager.happensBefore(clock2, clock1)).toBe(false);
  });

  it('should clone a vector clock', () => {
    const original = { peer1: 5, peer2: 3 };
    const cloned = VectorClockManager.clone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);

    cloned.peer1 = 10;
    expect(original.peer1).toBe(5);
  });
});