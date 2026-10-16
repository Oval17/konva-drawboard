import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Pointer position returned by the mocked Stage; tests mutate it to simulate
// drags. (Must be mock-prefixed for the jest.mock factory hoisting rules.)
let mockPointer = { x: 100, y: 100 };

jest.mock('react-konva', () => {
  const React = require('react');
  return {
    Stage: React.forwardRef((props: any, ref: any) => {
      const elRef = React.useRef(null);
      React.useImperativeHandle(ref, () => ({
        getPointerPosition: () => ({ ...mockPointer }),
        toDataURL: () => 'data:image/png;base64,TEST',
      }));
      // react-konva accepts Konva's lowercase event names (onMousemove,
      // onMouseup); map them to React's camelCase for the plain-div mock.
      const divProps = { ...props, ref: elRef, 'data-testid': 'stage' };
      divProps.onMouseMove = props.onMousemove;
      divProps.onMouseUp = props.onMouseup;
      return React.createElement('div', divProps);
    }),
    Layer: (props: any) => React.createElement('div', props),
    Line: () => null,
    Rect: () => null,
    Ellipse: () => null,
    Arrow: () => null,
    Text: () => null,
  };
});

const stage = () => screen.getByTestId('stage');

beforeEach(() => {
  mockPointer = { x: 100, y: 100 };
});

test('renders toolbar with pen and eraser', () => {
  render(<App />);
  expect(screen.getByText('Pen')).toBeInTheDocument();
  expect(screen.getByText('Eraser')).toBeInTheDocument();
  expect(screen.getByText('Export PNG')).toBeInTheDocument();
});

test('renders shape tools', () => {
  render(<App />);
  for (const label of ['Rect', 'Ellipse', 'Arrow', 'Text']) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
});

test('selecting a shape tool updates pressed state', () => {
  render(<App />);
  const rect = screen.getByText('Rect');
  fireEvent.click(rect);
  expect(rect).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Pen')).toHaveAttribute('aria-pressed', 'false');
});

test('undo and redo buttons start disabled', () => {
  render(<App />);
  expect(screen.getByText('Undo')).toBeDisabled();
  expect(screen.getByText('Redo')).toBeDisabled();
  expect(screen.getByText(/Strokes: 0/)).toBeInTheDocument();
});

test('switching to eraser updates pressed state', () => {
  render(<App />);
  const eraser = screen.getByText('Eraser');
  fireEvent.click(eraser);
  expect(eraser).toHaveAttribute('aria-pressed', 'true');
});

test('pen: mousedown + mousemove commits a stroke, undo removes it', () => {
  render(<App />);
  fireEvent.mouseDown(stage(), { buttons: 1 });
  mockPointer = { x: 140, y: 130 };
  fireEvent.mouseMove(stage(), { buttons: 1 });
  fireEvent.mouseUp(stage());
  expect(screen.getByText(/Strokes: 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Undo'));
  expect(screen.getByText(/Strokes: 0/)).toBeInTheDocument();
});

test('rect: drag previews a draft and commits on mouseup', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Rect'));
  fireEvent.mouseDown(stage(), { buttons: 1 });
  mockPointer = { x: 180, y: 150 };
  fireEvent.mouseMove(stage(), { buttons: 1 });
  expect(screen.getByText(/Shapes: 0/)).toBeInTheDocument();
  fireEvent.mouseUp(stage());
  expect(screen.getByText(/Shapes: 1/)).toBeInTheDocument();
});

test('text: click opens focused editor, Enter commits a text shape', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Text'));
  fireEvent.mouseDown(stage(), { buttons: 1 });
  const input = screen.getByLabelText('shape text');
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: 'hello' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByLabelText('shape text')).toBeNull();
  expect(screen.getByText(/Shapes: 1/)).toBeInTheDocument();
});

test('text: Escape cancels the editor without committing', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Text'));
  fireEvent.mouseDown(stage(), { buttons: 1 });
  const input = screen.getByLabelText('shape text');
  fireEvent.change(input, { target: { value: 'nope' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByLabelText('shape text')).toBeNull();
  expect(screen.getByText(/Shapes: 0/)).toBeInTheDocument();
});

test('export: produces a PNG download without error status', () => {
  render(<App />);
  const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByText('Export PNG'));
  expect(clickSpy).toHaveBeenCalled();
  expect(screen.queryByText(/Export failed/)).toBeNull();
  clickSpy.mockRestore();
});
