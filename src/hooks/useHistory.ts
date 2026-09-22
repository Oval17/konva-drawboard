import { useCallback, useRef, useState } from 'react';
import { HISTORY_LIMIT } from '../types';

/**
 * Generic stroke-level history without nested setState updaters.
 * Refs are the source of truth for the next mutation; states mirror them for render.
 * All mutations compute next values first, then set state once — safe under StrictMode.
 *
 * - commit(next): push current onto past, clear future, apply next (one undo step).
 * - stage(next): apply next without touching past/future (previews, mousemove).
 * - reset(next): replace state and clear past/future (loading).
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const stateRef = useRef(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const sync = useCallback((next: T, nextPast: T[], nextFuture: T[]) => {
    stateRef.current = next;
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    setState(next);
    setPast(nextPast);
    setFuture(nextFuture);
  }, []);

  const commit = useCallback(
    (next: T | ((prev: T) => T)) => {
      const cur = stateRef.current;
      const value = typeof next === 'function' ? (next as (prev: T) => T)(cur) : next;
      sync(value, [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), cur], []);
    },
    [sync]
  );

  const stage = useCallback((next: T | ((prev: T) => T)) => {
    const cur = stateRef.current;
    const value = typeof next === 'function' ? (next as (prev: T) => T)(cur) : next;
    stateRef.current = value;
    setState(value);
  }, []);

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const previous = p[p.length - 1];
    const nextFuture = [stateRef.current, ...futureRef.current].slice(0, HISTORY_LIMIT);
    sync(previous, p.slice(0, -1), nextFuture);
  }, [sync]);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const [next, ...rest] = f;
    const nextPast = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), stateRef.current];
    sync(next, nextPast, rest);
  }, [sync]);

  const clear = useCallback(
    (empty: T) => {
      sync(empty, [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), stateRef.current], []);
    },
    [sync]
  );

  /** Load without polluting undo stack (fresh baseline). */
  const reset = useCallback(
    (next: T) => {
      sync(next, [], []);
    },
    [sync]
  );

  return {
    state,
    commit,
    stage,
    undo,
    redo,
    clear,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
