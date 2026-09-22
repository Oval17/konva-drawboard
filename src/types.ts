export type PenTool = 'pen' | 'eraser';
export type ShapeKind = 'rect' | 'ellipse' | 'arrow' | 'text';
export type Tool = PenTool | ShapeKind;

export interface DrawnLine {
  tool: PenTool;
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export interface RectShape {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
}

export interface EllipseShape {
  kind: 'ellipse';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  stroke: string;
  strokeWidth: number;
}

export interface ArrowShape {
  kind: 'arrow';
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
}

export interface TextShape {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
}

export type Shape = RectShape | EllipseShape | ArrowShape | TextShape;

export interface CanvasDoc {
  lines: DrawnLine[];
  shapes: Shape[];
}

export const EMPTY_DOC: CanvasDoc = { lines: [], shapes: [] };

export const STORAGE_KEY = 'konva-drawboard-v1';
export const STORAGE_VERSION = 2;
export const HISTORY_LIMIT = 50;
export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 30;
export const ERASER_WIDTH = 20;
export const TEXT_FONT_SIZE = 20;
/** Drags smaller than this are treated as clicks (no shape committed). */
export const MIN_SHAPE_SIZE = 4;

export const SHAPE_TOOLS: ShapeKind[] = ['rect', 'ellipse', 'arrow', 'text'];

export function isShapeTool(t: Tool): t is ShapeKind {
  return (SHAPE_TOOLS as Tool[]).includes(t);
}
