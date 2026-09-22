import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { useLineHistory } from './hooks/useLineHistory';
import type { DrawnLine, Tool } from './types';
import { STORAGE_KEY } from './types';
import './App.css';

function isValidLine(v: unknown): v is DrawnLine {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.tool !== 'pen' && o.tool !== 'eraser') return false;
  if (typeof o.stroke !== 'string' || typeof o.strokeWidth !== 'number') return false;
  if (!Array.isArray(o.points) || o.points.length < 2) return false;
  if (!o.points.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  if (o.strokeWidth <= 0 || o.strokeWidth > 100) return false;
  return true;
}

function getPointerPos(target: any): { x: number; y: number } | null {
  const stage = target.getStage?.();
  if (!stage) return null;
  return stage.getPointerPosition();
}

function App() {
  const { lines, beginStroke, updateLastLine, undo, redo, clear, reset, canUndo, canRedo } =
    useLineHistory([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);

  useEffect(() => {
    toolRef.current = tool;
    colorRef.current = color;
    widthRef.current = strokeWidth;
  }, [tool, color, strokeWidth]);

  const [stageSize, setStageSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 140 : 600,
  });

  useEffect(() => {
    const onResize = () =>
      setStageSize({ width: window.innerWidth, height: window.innerHeight - 140 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleStart = useCallback(
    (e: any) => {
      const pos = getPointerPos(e.target);
      if (!pos) return;
      isDrawing.current = true;
      const t = toolRef.current;
      beginStroke({
        tool: t,
        points: [pos.x, pos.y],
        stroke: t === 'pen' ? colorRef.current : '#ffffff',
        strokeWidth: t === 'pen' ? widthRef.current : 20,
      });
    },
    [beginStroke]
  );

  const handleMove = useCallback(
    (e: any) => {
      if (!isDrawing.current) return;
      // If mouse buttons released outside the stage, stop the stroke.
      if (e?.evt && 'buttons' in e.evt && (e.evt as MouseEvent).buttons === 0) {
        isDrawing.current = false;
        return;
      }
      const pos = getPointerPos(e.target);
      if (!pos) return;
      updateLastLine([pos.x, pos.y]);
    },
    [updateLastLine]
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
    if (!stage) return;
    try {
      const uri = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'konva-drawing.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // canvas too large / tainted — ignore for Phase 1
    }
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage full / unavailable
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
      <p className="hint">
        Draw with mouse or touch. Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo. Strokes: {lines.length}
      </p>
    </div>
  );
}

export default App;
