import type { DrawnLine } from './types';
import { MAX_STROKE_WIDTH, MIN_STROKE_WIDTH, ERASER_WIDTH } from './types';

export function isValidLine(v: unknown): v is DrawnLine {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.tool !== 'pen' && o.tool !== 'eraser') return false;
  if (typeof o.stroke !== 'string' || typeof o.strokeWidth !== 'number') return false;
  if (!Array.isArray(o.points) || o.points.length < 2) return false;
  if (!o.points.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  if (o.strokeWidth < MIN_STROKE_WIDTH || o.strokeWidth > MAX_STROKE_WIDTH) {
    if (!(o.tool === 'eraser' && o.strokeWidth === ERASER_WIDTH)) return false;
  }
  return true;
}
