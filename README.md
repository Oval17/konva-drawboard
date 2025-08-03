# Konva Drawing Board

A simple and interactive drawing board built with React and Konva.js. This application allows users to draw freely on a canvas with pen and eraser tools.

## Features

- **Free-hand Drawing**: Draw naturally with a pen tool
- **Eraser Tool**: Erase parts of your drawing
- **Responsive Design**: Adapts to different screen sizes
- **Real-time Drawing**: Smooth drawing experience with mouse events
- **TypeScript Support**: Built with TypeScript for better type safety

## Technologies Used

- **React 19.1.1**: Modern React with hooks
- **Konva.js 9.3.22**: 2D canvas library for drawing
- **React-Konva 19.0.7**: React bindings for Konva
- **TypeScript 4.9.5**: Type-safe JavaScript
- **React Scripts 5.0.1**: Create React App build tools

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd konva-drawboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App (not recommended)

## How to Use

1. **Pen Tool**: Click the "Pen" button to activate the drawing pen
2. **Eraser Tool**: Click the "Eraser" button to activate the eraser
3. **Drawing**: Click and drag on the canvas to draw
4. **Erasing**: Click and drag with the eraser tool to remove parts of your drawing

## Project Structure

```
konva-drawboard/
├── public/                 # Static files
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.css           # Application styles
│   ├── index.tsx         # Application entry point
│   └── ...               # Other React files
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Key Components

### App.tsx
The main component that handles:
- Drawing state management
- Mouse event handling
- Tool switching (pen/eraser)
- Canvas rendering with Konva

### Features Explained

- **State Management**: Uses React hooks (`useState`, `useRef`) for managing drawing lines and tool selection
- **Mouse Events**: Handles `mousedown`, `mousemove`, and `mouseup` events for smooth drawing
- **Konva Integration**: Uses `Stage`, `Layer`, and `Line` components for canvas rendering
- **Tool System**: Supports pen and eraser tools with different stroke properties

## Browser Support

This application works on all modern browsers that support:
- ES6+ JavaScript features
- HTML5 Canvas API
- React 19

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Create React App](https://create-react-app.dev/)
- Drawing functionality powered by [Konva.js](https://konvajs.org/)
- React bindings provided by [React-Konva](https://github.com/konvajs/react-konva) 