import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { useLineHistory } from './hooks/useLineHistory';
import type { Tool } from './types';
import { STORAGE_KEY } from './types';
import './App.css';

function getPointerPos(target: any): { x: number; y: number } | null {
  const stage = target.getStage?.();
  if (!stage) return null;
  return stage.getPointerPosition();
}

function App() {
  const { lines, beginStroke, updateLastLine, undo, redo, clear, replaceAll, canUndo, canRedo } =
    useLineHistory([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const isDrawing = useRef(false);
  const stageRef = useRef<Konva.Stage>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  toolRef.current = tool;
  colorRef.current = color;
  widthRef.current = strokeWidth;

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

  // Load saved drawing once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) replaceAll(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: ctrl/cmd+z undo, ctrl/cmd+shift+z or ctrl+y redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      const pos = getPointerPos(e.target);
      if (!pos) return;
      updateLastLine([pos.x, pos.y]);
    },
    [updateLastLine]
  );

  const handleEnd = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'konva-drawing.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
