import { renderHook, act } from '@testing-library/react';
import { useLineHistory } from './useLineHistory';
import { isValidLine } from '../validation';

const line = (over: Record<string, unknown> = {}) => ({
  tool: 'pen' as const,
  points: [0, 0, 10, 10],
  stroke: '#000000',
  strokeWidth: 3,
  ...over,
});

test('beginStroke + undo/redo works at stroke level', () => {
  const { result } = renderHook(() => useLineHistory([]));
  expect(result.current.canUndo).toBe(false);

  act(() => {
    result.current.beginStroke(line());
  });
  act(() => {
    result.current.beginStroke(line({ stroke: '#ff0000' }));
  });
  expect(result.current.lines).toHaveLength(2);

  act(() => {
    result.current.undo();
  });
  expect(result.current.lines).toHaveLength(1);
  expect(result.current.canRedo).toBe(true);

  act(() => {
    result.current.redo();
  });
  expect(result.current.lines).toHaveLength(2);
});

test('updateLastLine appends without creating undo step', () => {
  const { result } = renderHook(() => useLineHistory([]));
  act(() => {
    result.current.beginStroke(line());
  });
  act(() => {
    result.current.updateLastLine([20, 20]);
  });
  expect(result.current.lines[0].points).toEqual([0, 0, 10, 10, 20, 20]);
  act(() => {
    result.current.undo();
  });
  expect(result.current.lines).toHaveLength(0);
});

test('isValidLine rejects bad widths and non-finite points', () => {
  expect(isValidLine(line())).toBe(true);
  expect(isValidLine(line({ strokeWidth: 0 }))).toBe(false);
  expect(isValidLine(line({ strokeWidth: 31 }))).toBe(false);
  expect(isValidLine(line({ tool: 'eraser', strokeWidth: 20 }))).toBe(true);
  expect(isValidLine(line({ points: [0, NaN] }))).toBe(false);
  expect(isValidLine(line({ points: [0] }))).toBe(false);
});
