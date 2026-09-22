import type { DrawnLine } from '../types';
import { useHistory } from './useHistory';

/**
 * Stroke-level line history. Thin adapter over useHistory so line-only
 * behavior (and its tests) stay stable while the app moves to CanvasDoc.
 */
export function useLineHistory(initial: DrawnLine[] = []) {
  const h = useHistory<DrawnLine[]>(initial);

  return {
    lines: h.state,
    beginStroke: (newLine: DrawnLine) => h.commit((prev) => [...prev, newLine]),
    updateLastLine: (points: number[]) =>
      h.stage((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const updated = { ...last, points: last.points.concat(points) };
        return [...prev.slice(0, -1), updated];
      }),
    undo: h.undo,
    redo: h.redo,
    clear: () => {
      // Avoid pushing no-op clears onto the undo stack.
      if (h.state.length === 0) return;
      h.commit([]);
    },
    reset: h.reset,
    canUndo: h.canUndo,
    canRedo: h.canRedo,
  };
}
