import { buildShape } from './shapes';

test('buildShape returns null for clicks and tiny drags', () => {
  const a = { x: 10, y: 10 };
  expect(buildShape('rect', a, { x: 10, y: 10 }, '#000', 3)).toBe(null);
  expect(buildShape('ellipse', a, { x: 12, y: 11 }, '#000', 3)).toBe(null);
  expect(buildShape('arrow', a, { x: 11, y: 10 }, '#000', 3)).toBe(null);
});

test('buildShape rejects axis-aligned drags that validation would drop', () => {
  // dx == 0 → zero-width rect / zero-radius ellipse (isValidShape requires > 0)
  expect(buildShape('rect', { x: 10, y: 10 }, { x: 10, y: 100 }, '#000', 3)).toBe(null);
  expect(buildShape('ellipse', { x: 10, y: 10 }, { x: 100, y: 10 }, '#000', 3)).toBe(null);
  expect(buildShape('arrow', { x: 10, y: 10 }, { x: 10, y: 10 }, '#000', 3)).toBe(null);
});

test('buildShape builds valid geometry for real drags', () => {
  expect(buildShape('rect', { x: 10, y: 10 }, { x: 60, y: 50 }, '#f00', 2)).toEqual({
    kind: 'rect',
    x: 10,
    y: 10,
    width: 50,
    height: 40,
    stroke: '#f00',
    strokeWidth: 2,
  });
  expect(buildShape('ellipse', { x: 10, y: 10 }, { x: 30, y: 50 }, '#000', 3)).toEqual({
    kind: 'ellipse',
    x: 20,
    y: 30,
    radiusX: 10,
    radiusY: 20,
    stroke: '#000',
    strokeWidth: 3,
  });
  expect(buildShape('arrow', { x: 0, y: 0 }, { x: 20, y: 0 }, '#000', 3)).toEqual({
    kind: 'arrow',
    points: [0, 0, 20, 0],
    stroke: '#000',
    strokeWidth: 3,
  });
});
