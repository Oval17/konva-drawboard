import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { useHistory } from './hooks/useHistory';
import type { CanvasDoc, Shape, ShapeKind, Tool } from './types';
import {
  EMPTY_DOC,
  STORAGE_KEY,
  STORAGE_VERSION,
  ERASER_WIDTH,
  TEXT_FONT_SIZE,
  MIN_SHAPE_SIZE,
  isShapeTool,
} from './types';
import { normalizeDoc } from './validation';
import './App.css';

interface Point {
  x: number;
  y: number;
}

function buildShape(
  kind: Exclude<ShapeKind, 'text'>,
  a: Point,
  b: Point,
  stroke: string,
  strokeWidth: number
): Shape | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < MIN_SHAPE_SIZE && Math.abs(dy) < MIN_SHAPE_SIZE) return null;
  switch (kind) {
    case 'rect':
      return {
        kind: 'rect',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
        stroke,
        strokeWidth,
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        radiusX: Math.abs(dx) / 2,
        radiusY: Math.abs(dy) / 2,
        stroke,
        strokeWidth,
      };
    case 'arrow':
      return { kind: 'arrow', points: [a.x, a.y, b.x, b.y], stroke, strokeWidth };
  }
}

function renderShape(s: Shape, i: number, opacity = 1) {
  switch (s.kind) {
    case 'rect':
      return (
        <Rect
          key={i}
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          opacity={opacity}
        />
      );
    case 'ellipse':
      return (
        <Ellipse
          key={i}
          x={s.x}
          y={s.y}
          radiusX={s.radiusX}
          radiusY={s.radiusY}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          opacity={opacity}
        />
      );
    case 'arrow':
      return (
        <Arrow
          key={i}
          points={s.points}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          pointerLength={10}
          pointerWidth={10}
          opacity={opacity}
        />
      );
    case 'text':
      return (
        <KonvaText
          key={i}
          x={s.x}
          y={s.y}
          text={s.text}
          fontSize={s.fontSize}
          fill={s.fill}
          opacity={opacity}
        />
      );
  }
}

function App() {
  const { state: doc, commit, stage, undo, redo, reset, canUndo, canRedo } =
    useHistory<CanvasDoc>(EMPTY_DOC);
  const { lines, shapes } = doc;
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  const anchorRef = useRef<Point | null>(null);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [textDraft, setTextDraft] = useState<Point | null>(null);
  const [textValue, setTextValue] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    widthRef.current = strokeWidth;
  }, [tool, color, strokeWidth]);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Measure the container (App is max-width:1200px) so the Stage never
  // overflows on wide screens. ResizeObserver covers both window resizes
  // and layout changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth || 800;
      const h = Math.max(400, window.innerHeight - 260);
      setStageSize({ width: w, height: h });
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const serialize = useCallback((d: CanvasDoc) => JSON.stringify({ version: STORAGE_VERSION, ...d }), []);

  // Load saved drawing once (validated, without polluting undo stack).
  // Accepts the legacy v1 bare-lines array.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const normalized = normalizeDoc(JSON.parse(raw) as unknown);
        if (normalized) reset(normalized);
      }
    } catch {
      // ignore corrupt storage
    } finally {
      loadedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced) so a forgotten manual Save doesn't lose work.
  useEffect(() => {
    if (!loadedRef.current) return;
    setStatus(null);
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serialize(doc));
      } catch {
        setStatus('Autosave failed: storage full or unavailable.');
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [doc, serialize]);

  // Keyboard shortcuts: ctrl/cmd+z undo, ctrl/cmd+shift+z or ctrl+y redo
  // Skip when typing in inputs so native undo still works.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const getStagePos = useCallback((): Point | null => {
    const pos = stageRef.current?.getPointerPosition();
    return pos ?? null;
  }, []);

  const cancelShapeFlow = useCallback(() => {
    isDrawing.current = false;
    anchorRef.current = null;
    setDraft(null);
  }, []);

  const handleToolChange = useCallback(
    (t: Tool) => {
      // Switching tools abandons any in-progress shape or text draft.
      cancelShapeFlow();
      setTextDraft(null);
      setTextValue('');
      setTool(t);
    },
    [cancelShapeFlow]
  );

  const handleStart = useCallback(() => {
    const pos = getStagePos();
    if (!pos) return;
    const t = toolRef.current;
    if (t === 'text') {
      setTextDraft(pos);
      setTextValue('');
      return;
    }
    if (isShapeTool(t)) {
      isDrawing.current = true;
      anchorRef.current = pos;
      setDraft(null);
      return;
    }
    isDrawing.current = true;
    const lineTool = t; // 'pen' | 'eraser'
    commit((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          tool: lineTool,
          points: [pos.x, pos.y],
          // NB: stroke is ignored for eraser (destination-out), but keep a
          // stable value so saved lines validate.
          stroke: lineTool === 'pen' ? colorRef.current : '#ffffff',
          strokeWidth: lineTool === 'pen' ? widthRef.current : ERASER_WIDTH,
        },
      ],
    }));
  }, [commit, getStagePos]);

  const handleMove = useCallback(
    (e: { evt?: unknown }) => {
      if (!isDrawing.current) return;
      // If mouse buttons released outside the stage, stop the stroke.
      const evt = e?.evt as MouseEvent | undefined;
      if (evt && 'buttons' in evt && evt.buttons === 0) {
        cancelShapeFlow();
        return;
      }
      const pos = getStagePos();
      if (!pos) return;
      const t = toolRef.current;
      if (isShapeTool(t) && t !== 'text') {
        const anchor = anchorRef.current;
        if (!anchor) return;
        setDraft(buildShape(t, anchor, pos, colorRef.current, widthRef.current));
        return;
      }
      const x = pos.x;
      const y = pos.y;
      stage((prev) => {
        if (prev.lines.length === 0) return prev;
        const last = prev.lines[prev.lines.length - 1];
        const updated = { ...last, points: last.points.concat([x, y]) };
        return { ...prev, lines: [...prev.lines.slice(0, -1), updated] };
      });
    },
    [stage, getStagePos, cancelShapeFlow]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Commit a finished drag-shape as a single undo step; the live preview
    // lived outside history (draft state), so undo removes the whole shape.
    if (draft && anchorRef.current) {
      const finished = draft;
      commit((prev) => ({ ...prev, shapes: [...prev.shapes, finished] }));
    }
    anchorRef.current = null;
    setDraft(null);
  }, [draft, commit]);

  // End stroke even if pointer is released outside the canvas.
  useEffect(() => {
    const onUp = () => {
      isDrawing.current = false;
      anchorRef.current = null;
      setDraft(null);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const commitText = useCallback(() => {
    if (!textDraft) return;
    const value = textValue.trim();
    if (value) {
      const at = textDraft;
      const fill = colorRef.current;
      commit((prev) => ({
        ...prev,
        shapes: [
          ...prev.shapes,
          { kind: 'text', x: at.x, y: at.y, text: value, fontSize: TEXT_FONT_SIZE, fill },
        ],
      }));
    }
    setTextDraft(null);
    setTextValue('');
  }, [textDraft, textValue, commit]);

  const cancelText = useCallback(() => {
    setTextDraft(null);
    setTextValue('');
  }, []);

  const handleClear = useCallback(() => {
    cancelShapeFlow();
    cancelText();
    if (lines.length === 0 && shapes.length === 0) return;
    commit(EMPTY_DOC);
  }, [lines.length, shapes.length, commit, cancelShapeFlow, cancelText]);

  const handleExport = useCallback(() => {
    const stageNode = stageRef.current;
    if (!stageNode) {
      setStatus('Export failed: canvas not ready.');
      return;
    }
    try {
      const uri = stageNode.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'konva-drawing.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus(null);
    } catch {
      setStatus('Export failed: canvas too large or unavailable.');
    }
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize(doc));
      setStatus('Saved.');
    } catch {
      setStatus('Save failed: storage full or unavailable.');
    }
  }, [doc, serialize]);

  return (
    <div className="App">
      <h1 className="app-title">Konva Drawing Board</h1>
      <Toolbar
        tool={tool}
        onToolChange={handleToolChange}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClear}
        onExport={handleExport}
        onSave={handleSave}
      />
      <div ref={containerRef} className="stage-wrap">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleStart}
          onMousemove={handleMove}
          onMouseup={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="draw-stage"
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.stroke}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
          <Layer>
            {shapes.map((s, i) => renderShape(s, i))}
            {draft && renderShape(draft, shapes.length, 0.7)}
          </Layer>
        </Stage>
        {textDraft && (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="text-input"
            style={{ left: textDraft.x, top: textDraft.y, color }}
            value={textValue}
            maxLength={500}
            placeholder="Type text, Enter to place"
            aria-label="shape text"
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText();
              else if (e.key === 'Escape') cancelText();
            }}
            onBlur={commitText}
          />
        )}
      </div>
      {status && (
        <p role="status" className="hint">
          {status}
        </p>
      )}
      <p className="hint">
        Draw with mouse or touch. Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo. Strokes: {lines.length}{' '}
        Shapes: {shapes.length} (eraser affects pen strokes only).
      </p>
    </div>
  );
}

export default App;
