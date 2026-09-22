import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { useLineHistory } from './hooks/useLineHistory';
import type { Tool } from './types';
import { STORAGE_KEY, ERASER_WIDTH } from './types';
import { isValidLine } from './validation';
import './App.css';

function App() {
  const { lines, beginStroke, updateLastLine, undo, redo, clear, reset, canUndo, canRedo } =
    useLineHistory([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
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

  // Load saved drawing once (validated, without polluting undo stack)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(isValidLine)) reset(parsed);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        setStatus('Autosave failed: storage full or unavailable.');
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [lines]);

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

  const getStagePos = useCallback(() => {
    const pos = stageRef.current?.getPointerPosition();
    return pos ?? null;
  }, []);

  const handleStart = useCallback(
    () => {
      const pos = getStagePos();
      if (!pos) return;
      isDrawing.current = true;
      const t = toolRef.current;
      beginStroke({
        tool: t,
        points: [pos.x, pos.y],
        // NB: stroke is ignored for eraser (destination-out), but keep a
        // stable value so saved lines validate.
        stroke: t === 'pen' ? colorRef.current : '#ffffff',
        strokeWidth: t === 'pen' ? widthRef.current : ERASER_WIDTH,
      });
    },
    [beginStroke, getStagePos]
  );

  const handleMove = useCallback(
    (e: { evt?: unknown }) => {
      if (!isDrawing.current) return;
      // If mouse buttons released outside the stage, stop the stroke.
      const evt = e?.evt as MouseEvent | undefined;
      if (evt && 'buttons' in evt && evt.buttons === 0) {
        isDrawing.current = false;
        return;
      }
      const pos = getStagePos();
      if (!pos) return;
      updateLastLine([pos.x, pos.y]);
    },
    [updateLastLine, getStagePos]
  );

  const handleEnd = useCallback(() => {
    isDrawing.current = false;
  }, []);

  // End stroke even if pointer is released outside the canvas.
  useEffect(() => {
    const onUp = () => {
      isDrawing.current = false;
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) {
      setStatus('Export failed: canvas not ready.');
      return;
    }
    try {
      const uri = stage.toDataURL({ pixelRatio: 2 });
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      setStatus('Saved.');
    } catch {
      setStatus('Save failed: storage full or unavailable.');
    }
  }, [lines]);

  return (
    <div className="App">
      <h1 className="app-title">Konva Drawing Board</h1>
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClear={clear}
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
        </Stage>
      </div>
      {status && (
        <p role="status" className="hint">
          {status}
        </p>
      )}
      <p className="hint">
        Draw with mouse or touch. Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo. Strokes: {lines.length}
      </p>
    </div>
  );
}

export default App;
