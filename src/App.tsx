import React, { useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import './App.css';

interface DrawnLine {
  tool: 'pen' | 'eraser';
  points: number[];
}

function App() {
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const isDrawing = useRef(false);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine = {
      ...lastLine,
      points: lastLine.points.concat([point.x, point.y]),
    };
    const newLines = lines.slice(0, -1).concat(lastLine);
    setLines(newLines);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div className="App">
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={() => setTool('pen')}
          style={{ fontWeight: tool === 'pen' ? 'bold' : 'normal' }}
        >
          Pen
        </button>
        <button
          onClick={() => setTool('eraser')}
          style={{ fontWeight: tool === 'eraser' ? 'bold' : 'normal', marginLeft: 8 }}
        >
          Eraser
        </button>
      </div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight - 60}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        style={{ background: '#fff', border: '1px solid #ccc' }}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.tool === 'pen' ? 'black' : '#fff'}
              strokeWidth={line.tool === 'pen' ? 3 : 20}
              tension={0.5}
              lineCap="round"
              globalCompositeOperation={
                line.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

export default App;
