export type Tool = 'pen' | 'eraser';

export interface DrawnLine {
  tool: Tool;
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export const STORAGE_KEY = 'konva-drawboard-v1';
export const HISTORY_LIMIT = 50;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 30;
export const ERASER_WIDTH = 20;
