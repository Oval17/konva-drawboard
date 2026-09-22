import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

jest.mock('react-konva', () => {
  const React = require('react');
  return {
    Stage: React.forwardRef((props: any, ref: any) =>
      React.createElement('div', { ...props, ref, 'data-testid': 'stage' })
    ),
    Layer: (props: any) => React.createElement('div', props),
    Line: () => null,
    Rect: () => null,
    Ellipse: () => null,
    Arrow: () => null,
    Text: () => null,
  };
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
