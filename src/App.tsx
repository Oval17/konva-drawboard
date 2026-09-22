import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { useHistory } from './hooks/useHistory';
import type { CanvasDoc, Shape, Tool } from './types';
import {
  EMPTY_DOC,
  STORAGE_KEY,
  STORAGE_VERSION,
  ERASER_WIDTH,
  TEXT_FONT_SIZE,
  isShapeTool,
} from './types';
import { buildShape, type Point } from './shapes';
import { normalizeDoc } from './validation';
import './App.css';

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
  // Live mirrors so window-level pointer-up and blur/Enter races see
  // current values instead of stale render closures.
  const draftRef = useRef<Shape | null>(null);
  const textDraftRef = useRef<Point | null>(null);
  const textValueRef = useRef('');

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    textDraftRef.current = textDraft;
    textValueRef.current = textValue;
  }, [textDraft, textValue]);

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

  // Single finish path for drag-shapes: Stage mouseup, window mouseup
  // (release outside the canvas), touchend, and tool switches all commit
  // the in-progress preview instead of silently discarding it. Idempotent:
  // without an active drag it is a no-op, so double-firing is harmless.
  const finishShape = useCallback(
    (shouldCommit: boolean) => {
      isDrawing.current = false;
      anchorRef.current = null;
      const finished = draftRef.current;
      draftRef.current = null;
      setDraft(null);
      if (shouldCommit && finished) {
        commit((prev) => ({ ...prev, shapes: [...prev.shapes, finished] }));
      }
    },
    [commit]
  );

  const commitText = useCallback(() => {
    // Ref guard: Enter commits, then the ensuing blur re-enters with a stale
    // closure — the nulled ref makes the second call a no-op (no double shape).
    const at = textDraftRef.current;
    if (!at) return;
    textDraftRef.current = null;
    const value = textValueRef.current.trim();
    setTextDraft(null);
    setTextValue('');
    if (value) {
      const fill = colorRef.current;
      commit((prev) => ({
        ...prev,
        shapes: [
          ...prev.shapes,
          { kind: 'text', x: at.x, y: at.y, text: value, fontSize: TEXT_FONT_SIZE, fill },
        ],
      }));
    }
  }, [commit]);

  const cancelText = useCallback(() => {
    textDraftRef.current = null;
    setTextDraft(null);
    setTextValue('');
  }, []);

  const handleToolChange = useCallback(
    (t: Tool) => {
      // Switching tools finishes any in-progress shape instead of dropping it.
      finishShape(true);
      cancelText();
      setTool(t);
    },
    [finishShape, cancelText]
  );

  const handleStart = useCallback(() => {
    const pos = getStagePos();
    if (!pos) return;
    const t = toolRef.current;
    if (t === 'text') {
      // A pending draft was already committed by the input's blur; if the
      // user clicked without blurring (same-tick), commit it here first.
      const pending = textDraftRef.current;
      if (pending) {
        const value = textValueRef.current.trim();
        textDraftRef.current = null;
        if (value) {
          const fill = colorRef.current;
          const at = pending;
          commit((prev) => ({
            ...prev,
            shapes: [
              ...prev.shapes,
              { kind: 'text', x: at.x, y: at.y, text: value, fontSize: TEXT_FONT_SIZE, fill },
            ],
          }));
        }
      }
      textDraftRef.current = pos;
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
      // If mouse buttons released outside the stage, finish (commit partial)
      // rather than discarding the in-progress stroke or shape.
      const evt = e?.evt as MouseEvent | undefined;
      if (evt && 'buttons' in evt && evt.buttons === 0) {
        finishShape(true);
        return;
      }
      const pos = getStagePos();
      if (!pos) return;
      const t = toolRef.current;
      if (isShapeTool(t) && t !== 'text') {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const preview = buildShape(t, anchor, pos, colorRef.current, widthRef.current);
        draftRef.current = preview;
        setDraft(preview);
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
    [stage, getStagePos, finishShape]
  );

  const handleEnd = useCallback(() => {
    finishShape(true);
  }, [finishShape]);

  // End stroke even if pointer is released outside the canvas (commits).
  useEffect(() => {
    const onUp = () => {
      finishShape(true);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [finishShape]);

  const handleClear = useCallback(() => {
    finishShape(false);
    cancelText();
    if (lines.length === 0 && shapes.length === 0) return;
    // Fresh object: never commit the shared EMPTY_DOC reference.
    commit({ lines: [], shapes: [] });
  }, [lines.length, shapes.length, commit, finishShape, cancelText]);

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
