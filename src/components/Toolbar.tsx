import React from 'react';
import type { Tool } from '../types';
import { MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from '../types';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  color: string;
  onColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  onSave: () => void;
}

const PRESET_COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onSave,
}) => (
  <div className="toolbar" data-testid="toolbar">
    <div className="toolbar-group">
      <button type="button"
        onClick={() => onToolChange('pen')}
        className={tool === 'pen' ? 'active' : ''}
        aria-pressed={tool === 'pen'}
      >
        Pen
      </button>
      <button type="button"
        onClick={() => onToolChange('eraser')}
        className={tool === 'eraser' ? 'active' : ''}
        aria-pressed={tool === 'eraser'}
      >
        Eraser
      </button>
    </div>

    <div className="toolbar-group">
      <label>
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          aria-label="stroke color"
          disabled={tool === 'eraser'}
        />
      </label>
      <div className="swatches">
        {PRESET_COLORS.map((c) => (
          <button type="button"
            key={c}
            className={`swatch${c === color ? ' selected' : ''}`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            aria-label={`color ${c}`}
            disabled={tool === 'eraser'}
          />
        ))}
      </div>
      <label>
        Width {strokeWidth}px
        <input
          type="range"
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          aria-label="stroke width"
        />
      </label>
    </div>

    <div className="toolbar-group">
      <button type="button" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>
      <button type="button" onClick={onClear}>Clear</button>
    </div>

    <div className="toolbar-group">
      <button type="button" onClick={onExport}>Export PNG</button>
      <button type="button" onClick={onSave}>Save</button>
    </div>
  </div>
);
