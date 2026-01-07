# React Component Selector MCP - React Component Selector with Claude Code MCP Integration

## Overview

A standalone tool for selecting React components in the browser and exposing that selection to Claude Code via MCP. Works with any React/Next.js project.

**Package Name**: `react-component-selector-mcp`
**Project Type**: Standalone monorepo (not part of agentic-coding)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Any React/Next.js App                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  <ComponentSelector>                                 │   │
│  │    <App />                                          │   │
│  │  </ComponentSelector>                               │   │
│  │                                                     │   │
│  │  • Ctrl+Alt+C / Cmd+Option+C → selection mode        │   │
│  │  • Click component → capture data                   │   │
│  │  • Connects via WebSocket                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ WebSocket (port 3333)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  CLI / MCP Server                                           │
│  • Receives selections from browser                         │
│  • Exposes MCP tools to Claude Code                        │
└─────────────────────────────────────────────────────────────┘
                            │ MCP Protocol
                            ▼
                      Claude Code
```

## Key Decisions

| Decision | Choice |
|----------|--------|
| Injection method | Manual wrapper: `<ComponentSelector><App/></ComponentSelector>` |
| Selection trigger | Keyboard shortcut: Cmd+Option+C (Mac) / Ctrl+Alt+C (Win) |
| Communication | WebSocket server started by CLI |
| AI Integration | MCP server for Claude Code |

## Package Structure

```
react-component-selector-mcp/        # Standalone monorepo root
├── package.json                     # Root package.json (workspaces)
├── pnpm-workspace.yaml
├── tsconfig.json                    # Base TypeScript config
├── packages/
│   ├── react/                       # @react-component-selector-mcp/react - NPM package for React apps
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ComponentSelector.tsx
│   │       ├── SelectionOverlay.tsx
│   │       ├── hooks/
│   │       │   ├── useSelectionMode.ts
│   │       │   ├── useKeyboardShortcut.ts
│   │       │   ├── useFiberInspector.ts
│   │       │   └── useWebSocketClient.ts
│   │       └── utils/
│   │           ├── fiberWalker.ts
│   │           ├── screenshotCapture.ts
│   │           ├── sourceMapResolver.ts
│   │           └── componentMetadata.ts
│   │
│   └── cli/                         # @react-component-selector-mcp/cli - CLI/MCP Server
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── cli.ts
│           ├── server/
│           │   ├── websocket.ts
│           │   ├── mcp.ts
│           │   └── storage.ts
│           └── tools/
│               ├── getSelectedComponent.ts
│               ├── waitForSelection.ts
│               └── getSelectionHistory.ts
│
└── examples/                        # Example apps for testing
    └── nextjs-app/
```

## What Gets Captured (SelectionData)

```typescript
interface SelectionData {
  id: string;
  timestamp: number;

  component: {
    name: string;                    // React component name
    type: 'function' | 'class' | 'forwardRef' | 'memo';
  };

  source: {
    filePath: string | null;         // Resolved via source maps
    lineNumber: number | null;
    columnNumber: number | null;
  };

  props: Record<string, unknown>;
  state: Record<string, unknown> | null;

  dom: {
    tagName: string;
    className: string | null;
    boundingRect: DOMRect;
  };

  screenshot: {
    dataUrl: string;                 // base64 PNG
    width: number;
    height: number;
  };

  context: {
    pageUrl: string;
    parentComponents: string[];      // Component tree path
  };
}
```

## MCP Tools

### `get_selected_component`
Returns the most recently selected component. Use after user has made a selection.

### `wait_for_selection`
Blocks until user selects a component (or timeout). Use when you need to wait for user input.

**Parameters:**
- `timeout`: number (default: 60000ms)
- `triggerMessage`: optional string to show user

### `get_selection_history`
Returns recent selections for reviewing multiple components.

**Parameters:**
- `limit`: number (default: 10)
- `includeScreenshots`: boolean (default: false)

## Implementation Phases

### Phase 1: Core Infrastructure
1. Initialize monorepo structure with pnpm workspaces
2. Define shared types and Zod schemas
3. Implement WebSocket server (CLI side)
4. Implement WebSocket client hook (browser side)

### Phase 2: Browser Selection Logic
5. React fiber inspector (`useFiberInspector.ts`)
   - Access fiber via `__REACT_DEVTOOLS_GLOBAL_HOOK__` or internal keys
   - Extract component name, props, state
6. Source map resolution (`sourceMapResolver.ts`)
   - Parse `_debugSource` when available
   - Fallback to stack trace + source map fetching
7. Screenshot capture using `html-to-image`
8. Selection overlay component with hover highlighting

### Phase 3: MCP Integration
9. Keyboard shortcut handler (cross-platform)
10. Main `ComponentSelector` wrapper component
11. Selection storage with history
12. MCP server using `@modelcontextprotocol/sdk`

### Phase 4: CLI & Polish
13. CLI with Commander.js
14. MCP tools implementation
15. Dev-mode tree-shaking for production builds
16. Documentation and examples

## Dependencies

### Browser Package
- `html-to-image` - Screenshot capture
- `nanoid` - Unique IDs
- `source-map-js` - Source map parsing
- Peer deps: `react`, `react-dom` (18+)

### CLI Package
- `@modelcontextprotocol/sdk` - MCP protocol
- `commander` - CLI framework
- `ws` - WebSocket server
- `zod` - Schema validation

## Technical Challenges & Solutions

### React Fiber Access
```typescript
function getFiberFromElement(element: HTMLElement): Fiber | null {
  // Try DevTools hook first
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const fiber = window.__REACT_DEVTOOLS_GLOBAL_HOOK__
      .renderers?.get(1)?.findFiberByHostInstance?.(element);
    if (fiber) return fiber;
  }

  // Fallback to internal keys (__reactFiber$...)
  const fiberKey = Object.keys(element)
    .find(k => k.startsWith('__reactFiber$'));
  return fiberKey ? (element as any)[fiberKey] : null;
}
```

### Source Maps in RSC
React Server Components don't expose `_debugSource`. Fallback: parse Error stack traces and fetch `.map` files.

### Production Tree-Shaking
```typescript
export function ComponentSelector(props: Props) {
  if (process.env.NODE_ENV !== 'development') {
    return props.children;  // No-op in production
  }
  // ... implementation
}
```

## Usage Example

```bash
# Install in your React project
pnpm add -D @react-component-selector-mcp/react
```

```tsx
// In your React app's root (e.g., _app.tsx or layout.tsx)
import { ComponentPicker } from '@react-component-selector-mcp/react'

function App() {
  return (
    <ComponentPicker port={3333}>
      <YourApp />
    </ComponentPicker>
  )
}
```

```bash
# Terminal 1: Start your app
pnpm dev

# Configure MCP in Claude Code (see README for full setup)
# Or run CLI directly:
npx @react-component-selector-mcp/cli mcp --port 3333

# In browser: Press Ctrl+Alt+C (or Cmd+Option+C on Mac), click a component
# Claude Code can now use get_selected_component tool
```

## Reference Patterns (from agentic-coding repo)
- MCP server pattern: `@convex-js/src/cli/mcp.ts`
- Tool definitions: `@convex-js/src/cli/lib/mcp/tools/index.ts`
- Dev-only exports: `packages/debug-nextjs/src/index.ts`

## Project Location
**Repository**: https://github.com/zakstam/react-component-selector-mcp
