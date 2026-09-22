import { useCallback, useState } from 'react';
import type { DrawnLine } from '../types';
import { HISTORY_LIMIT } from '../types';

/**
 * Stroke-level history: past holds snapshots before each committed stroke,
 * future holds redo snapshots. Transient mousemove updates don't push history.
 */
export function useLineHistory(initial: DrawnLine[] = []) {
  const [lines, setLines] = useState<DrawnLine[]>(initial);
  const [past, setPast] = useState<DrawnLine[][]>([]);
  const [future, setFuture] = useState<DrawnLine[][]>([]);

  const beginStroke = useCallback((newLine: DrawnLine) => {
    setLines((prev) => {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), prev]);
      setFuture([]);
      return [...prev, newLine];
    });
  }, []);

  const updateLastLine = useCallback((points: number[]) => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updated = { ...last, points: last.points.concat(points) };
      return [...prev.slice(0, -1), updated];
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setLines((cur) => {
        setFuture((f) => [cur, ...f].slice(0, HISTORY_LIMIT));
        return previous;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const [next, ...rest] = f;
      setLines((cur) => {
        setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), cur]);
        return next;
      });
      return rest;
    });
  }, []);

  const clear = useCallback(() => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), prev]);
      setFuture([]);
      return [];
    });
  }, []);

  const replaceAll = useCallback((next: DrawnLine[]) => {
    setLines((prev) => {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  return {
    lines,
    setLines,
    beginStroke,
    updateLastLine,
    undo,
    redo,
    clear,
    replaceAll,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
