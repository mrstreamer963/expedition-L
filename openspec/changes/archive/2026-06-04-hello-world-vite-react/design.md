# Design: Hello World with Vite + React

## Architecture

### Project structure
```
expedition-L/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Root component
│   ├── index.css         # Global styles
│   └── vite-env.d.ts     # Vite type definitions
├── public/
│   └── vite.svg          # Default favicon
├── index.html            # HTML template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript config for app
├── tsconfig.node.json    # TypeScript config for Node
└── vite.config.ts        # Vite configuration
```

### Technology choices

| Technology | Version | Purpose |
|------------|---------|---------|
| Vite | ^5.x | Build tool and dev server |
| React | ^18.x | UI framework |
| TypeScript | ^5.x | Type safety |

### Key decisions

1. **Vite over Create React App**: Vite provides significantly faster startup and HMR, and is the modern recommended tooling
2. **TypeScript enabled**: Provides type safety from the start
3. **Minimal CSS**: Only essential global styles to render the app cleanly

### Component design

#### `App` component
- Renders a heading with "Hello, World!"
- Uses functional component with TypeScript types
- No state management needed for this simple demo

#### Entry point (`main.tsx`)
- Renders `App` component into the DOM
- Uses React 18's `createRoot` API

## Dependencies

### Runtime
- `react` ^18.3.1
- `react-dom` ^18.3.1

### Development
- `@vitejs/plugin-react` ^4.3.x
- `typescript` ^5.5.x
- `@types/react` ^18.3.x
- `@types/react-dom` ^18.3.x
- `vite` ^5.4.x

## Build process

1. `npm run dev` → Vite dev server with HMR on port 5173
2. `npm run build` → TypeScript type checking + Vite production build to `dist/`
3. `npm run preview` → Serve production build locally
