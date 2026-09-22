import { useCallback, useRef, useState } from 'react';
import type { DrawnLine } from '../types';
import { HISTORY_LIMIT } from '../types';

/**
 * Stroke-level history without nested setState updaters.
 * Refs are the source of truth for the next mutation; states mirror them for render.
 * All mutations compute next values first, then set state once — safe under StrictMode.
 */
export function useLineHistory(initial: DrawnLine[] = []) {
  const [lines, setLinesState] = useState<DrawnLine[]>(initial);
  const [past, setPastState] = useState<DrawnLine[][]>([]);
  const [future, setFutureState] = useState<DrawnLine[][]>([]);

  const linesRef = useRef(initial);
  const pastRef = useRef<DrawnLine[][]>([]);
  const futureRef = useRef<DrawnLine[][]>([]);

  const sync = useCallback(
    (nextLines: DrawnLine[], nextPast: DrawnLine[][], nextFuture: DrawnLine[][]) => {
      linesRef.current = nextLines;
      pastRef.current = nextPast;
      futureRef.current = nextFuture;
      setLinesState(nextLines);
      setPastState(nextPast);
      setFutureState(nextFuture);
    },
    []
  );

  const beginStroke = useCallback(
    (newLine: DrawnLine) => {
      const nextPast = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), linesRef.current];
      sync([...linesRef.current, newLine], nextPast, []);
    },
    [sync]
  );

  const updateLastLine = useCallback(
    (points: number[]) => {
      const cur = linesRef.current;
      if (cur.length === 0) return;
      const last = cur[cur.length - 1];
      const updated = { ...last, points: last.points.concat(points) };
      const next = [...cur.slice(0, -1), updated];
      linesRef.current = next;
      setLinesState(next);
    },
    []
  );

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const previous = p[p.length - 1];
    const nextFuture = [linesRef.current, ...futureRef.current].slice(0, HISTORY_LIMIT);
    sync(previous, p.slice(0, -1), nextFuture);
  }, [sync]);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const [next, ...rest] = f;
    const nextPast = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), linesRef.current];
    sync(next, nextPast, rest);
  }, [sync]);

  const clear = useCallback(() => {
    if (linesRef.current.length === 0) return;
    const nextPast = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), linesRef.current];
    sync([], nextPast, []);
  }, [sync]);

  /** Load without polluting undo stack (fresh baseline). */
  const reset = useCallback(
    (next: DrawnLine[]) => {
      sync(next, [], []);
    },
    [sync]
  );

  return {
    lines,
    beginStroke,
    updateLastLine,
    undo,
    redo,
    clear,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
