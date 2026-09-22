import type { Shape, ShapeKind } from './types';
import { MIN_SHAPE_SIZE } from './types';
import { isValidShape } from './validation';

export interface Point {
  x: number;
  y: number;
}

/**
 * Build a drag shape from anchor to current pointer. Returns null for
 * clicks / tiny drags. The result always passes isValidShape, so committed
 * shapes survive a save/load round-trip by construction.
 */
export function buildShape(
  kind: Exclude<ShapeKind, 'text'>,
  a: Point,
  b: Point,
  stroke: string,
  strokeWidth: number
): Shape | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < MIN_SHAPE_SIZE && Math.abs(dy) < MIN_SHAPE_SIZE) return null;
  let shape: Shape;
  switch (kind) {
    case 'rect':
      shape = {
        kind: 'rect',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
        stroke,
        strokeWidth,
      };
      break;
    case 'ellipse':
      shape = {
        kind: 'ellipse',
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        radiusX: Math.abs(dx) / 2,
        radiusY: Math.abs(dy) / 2,
        stroke,
        strokeWidth,
      };
      break;
    case 'arrow':
      shape = { kind: 'arrow', points: [a.x, a.y, b.x, b.y], stroke, strokeWidth };
      break;
  }
  // Axis-aligned drags (dx or dy == 0) yield zero-area geometry that the
  // validator rejects — drop them instead of committing unloadable shapes.
  return isValidShape(shape) ? shape : null;
}
