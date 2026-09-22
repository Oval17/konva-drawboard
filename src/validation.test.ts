import { isValidShape, isValidDoc, normalizeDoc } from './validation';

const rect = (over: Record<string, unknown> = {}) => ({
  kind: 'rect',
  x: 10,
  y: 10,
  width: 50,
  height: 40,
  stroke: '#000000',
  strokeWidth: 3,
  ...over,
});

test('isValidShape accepts rect/ellipse/arrow/text', () => {
  expect(isValidShape(rect())).toBe(true);
  expect(
    isValidShape({ kind: 'ellipse', x: 0, y: 0, radiusX: 5, radiusY: 5, stroke: '#fff', strokeWidth: 2 })
  ).toBe(true);
  expect(
    isValidShape({ kind: 'arrow', points: [0, 0, 10, 10], stroke: '#fff', strokeWidth: 2 })
  ).toBe(true);
  expect(
    isValidShape({ kind: 'text', x: 0, y: 0, text: 'hi', fontSize: 20, fill: '#000' })
  ).toBe(true);
});

test('isValidShape rejects degenerate and oversized shapes', () => {
  expect(isValidShape(rect({ width: 0 }))).toBe(false);
  expect(isValidShape(rect({ width: -5 }))).toBe(false);
  expect(isValidShape(rect({ strokeWidth: 31 }))).toBe(false);
  expect(isValidShape({ kind: 'arrow', points: [0, 0, 10], stroke: '#fff', strokeWidth: 2 })).toBe(
    false
  );
  expect(
    isValidShape({ kind: 'text', x: 0, y: 0, text: '', fontSize: 20, fill: '#000' })
  ).toBe(false);
  expect(isValidShape({ kind: 'star', x: 0, y: 0 })).toBe(false);
});

test('normalizeDoc accepts v2 docs and legacy v1 line arrays', () => {
  const line = { tool: 'pen', points: [0, 0, 5, 5], stroke: '#000', strokeWidth: 3 };
  expect(normalizeDoc([line])).toEqual({ lines: [line], shapes: [] });
  const doc = { version: 2, lines: [line], shapes: [rect()] };
  expect(normalizeDoc(doc)).toEqual({ lines: [line], shapes: [doc.shapes[0]] });
  expect(normalizeDoc({ version: 2, lines: [line], shapes: [rect({ width: 0 })] })).toBe(null);
  expect(normalizeDoc({ version: 1, lines: [], shapes: [] })).toBe(null);
  expect(normalizeDoc('garbage')).toBe(null);
});
