import type { CanvasDoc, DrawnLine, Shape } from './types';
import { MAX_STROKE_WIDTH, MIN_STROKE_WIDTH, ERASER_WIDTH, STORAGE_VERSION } from './types';

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

function isFiniteNum(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function validStroke(o: Record<string, unknown>): boolean {
  return (
    typeof o.stroke === 'string' &&
    isFiniteNum(o.strokeWidth) &&
    (o.strokeWidth as number) >= MIN_STROKE_WIDTH &&
    (o.strokeWidth as number) <= MAX_STROKE_WIDTH
  );
}

export function isValidShape(v: unknown): v is Shape {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  switch (o.kind) {
    case 'rect':
      return (
        isFiniteNum(o.x) &&
        isFiniteNum(o.y) &&
        isFiniteNum(o.width) &&
        isFiniteNum(o.height) &&
        (o.width as number) > 0 &&
        (o.height as number) > 0 &&
        validStroke(o)
      );
    case 'ellipse':
      return (
        isFiniteNum(o.x) &&
        isFiniteNum(o.y) &&
        isFiniteNum(o.radiusX) &&
        isFiniteNum(o.radiusY) &&
        (o.radiusX as number) > 0 &&
        (o.radiusY as number) > 0 &&
        validStroke(o)
      );
    case 'arrow':
      return (
        Array.isArray(o.points) &&
        o.points.length === 4 &&
        o.points.every(isFiniteNum) &&
        validStroke(o)
      );
    case 'text':
      return (
        isFiniteNum(o.x) &&
        isFiniteNum(o.y) &&
        typeof o.text === 'string' &&
        o.text.length > 0 &&
        o.text.length <= 500 &&
        isFiniteNum(o.fontSize) &&
        (o.fontSize as number) >= 8 &&
        (o.fontSize as number) <= 120 &&
        typeof o.fill === 'string'
      );
    default:
      return false;
  }
}

export function isValidDoc(v: unknown): v is CanvasDoc {
  if (Array.isArray(v)) {
    // Legacy v1 payload: bare lines array.
    return v.every(isValidLine);
  }
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.version !== STORAGE_VERSION) return false;
  return (
    Array.isArray(o.lines) &&
    (o.lines as unknown[]).every(isValidLine) &&
    Array.isArray(o.shapes) &&
    (o.shapes as unknown[]).every(isValidShape)
  );
}

export function normalizeDoc(v: unknown): CanvasDoc | null {
  if (!isValidDoc(v)) return null;
  if (Array.isArray(v)) return { lines: v, shapes: [] };
  return { lines: v.lines, shapes: v.shapes };
}
