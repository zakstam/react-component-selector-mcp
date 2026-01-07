# React Component Selector MCP

Select React components visually in the browser and expose selection data to Claude Code via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## Quick Start

```bash
# Install packages
npm install @react-component-selector-mcp/react
npm install -g @react-component-selector-mcp/cli
```

## What It Does

- **Visual Selection**: Press `Ctrl+Alt+C` (Windows/Linux) or `Cmd+Option+C` (Mac) to enter selection mode
- **Component Detection**: Automatically identifies React components under your cursor
- **Rich Metadata**: Captures component name, props, state, source location, and screenshot
- **MCP Integration**: Exposes selection data to Claude Code for AI-assisted development

## LLM Setup Instructions

<details>
<summary><strong>Click to expand full instructions for AI assistants</strong></summary>

Copy the entire block below and provide it to your AI assistant:

```text
TASK: Set up react-component-selector-mcp in this React project.

STEPS:

1. INSTALL PACKAGES
   Run: npm install @react-component-selector-mcp/react

2. WRAP ROOT COMPONENT
   Find the root layout file (look for: app/layout.tsx, pages/_app.tsx, src/App.tsx, or src/main.tsx).
   Import and wrap children with ComponentPicker:

   import { ComponentPicker } from '@react-component-selector-mcp/react'

   // Wrap the children/app content:
   <ComponentPicker port={3333}>
     {children}
   </ComponentPicker>

3. CREATE MCP CONFIG
   Create file: .mcp.json in project root with contents:
   {
     "mcpServers": {
       "react-component-selector": {
         "command": "npx",
         "args": ["@react-component-selector-mcp/cli", "mcp"]
       }
     }
   }

4. VERIFY SETUP
   - Start the dev server (npm run dev or equivalent)
   - Open browser to the app
   - Press Ctrl+Alt+C (Windows/Linux) or Cmd+Option+C (Mac)
   - A selection overlay should appear

DONE. The MCP tools get_selected_component, wait_for_selection, and get_selection_history are now available.
```

</details>

---

## Installation

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** 9+ (for development) or npm/yarn (for usage)

### From npm (Recommended)

```bash
# Install the React component in your project
npm install @react-component-selector-mcp/react

# Install the CLI globally
npm install -g @react-component-selector-mcp/cli
```

### From Source

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup instructions.

## Configuration

### 1. Add to Your React App

Wrap your app with the `ComponentPicker` component:

```tsx
// In your root layout (e.g., app/layout.tsx, _app.tsx, or main.tsx)
import { ComponentPicker } from "@react-component-selector-mcp/react";

export default function RootLayout({ children }) {
  return <ComponentPicker port={3333}>{children}</ComponentPicker>;
}
```

### 2. Configure Claude Code MCP

Add the MCP server configuration to Claude Code.

**Option A: Project-level** (recommended) - Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "react-component-selector": {
      "command": "npx",
      "args": ["@react-component-selector-mcp/cli", "mcp"]
    }
  }
}
```

**Option B: Global** - Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "react-component-selector": {
      "command": "npx",
      "args": ["@react-component-selector-mcp/cli", "mcp"]
    }
  }
}
```

> **Note**: The CLI uses default ports (WebSocket: 3333, API: 3334). To customize, use `--ws-port` and `--api-port` flags. The WebSocket port must match the `port` prop on `ComponentPicker`.

## Usage

### Select a Component

1. Start your React development server
2. Open your app in the browser
3. Press **Ctrl+Alt+C** (Windows/Linux) or **Cmd+Option+C** (Mac)
4. Click on any component to select it
5. The selection data is now available to Claude Code

### Available MCP Tools

Once configured, Claude Code has access to these tools:

| Tool                     | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `get_selected_component` | Returns the most recently selected component        |
| `wait_for_selection`     | Waits for user to select a component (with timeout) |
| `get_selection_history`  | Returns recent component selections                 |

### Example Claude Code Prompts

- "What component am I looking at?" (after selecting)
- "Wait for me to select a component, then explain its props"
- "Show me the selection history"

## What Gets Captured

When you select a component, the following data is captured:

| Data                | Description                                            |
| ------------------- | ------------------------------------------------------ |
| **Component Name**  | The React component name                               |
| **Component Type**  | function, class, memo, or forwardRef                   |
| **Source Location** | File path and line number (when source maps available) |
| **Props**           | Current prop values                                    |
| **State**           | Current state values                                   |
| **DOM Info**        | Tag name, classes, dimensions                          |
| **Screenshot**      | Visual snapshot of the component                       |
| **Hierarchy**       | Parent component chain                                 |
| **Page URL**        | Current browser URL                                    |

## Troubleshooting

### Component not detected

- Ensure `ComponentPicker` wraps your entire app
- Check that the port matches between React and CLI config
- Verify your React version is 18.0.0 or higher

### MCP connection failed

- **Check daemon status**: Run `npx @react-component-selector-mcp/cli status`
- **Restart daemon**: Run `npx @react-component-selector-mcp/cli stop` then restart Claude Code
- **Port conflict**: Ensure ports 3333 and 3334 are not in use by other applications
- **Wrong flags**: Use `--ws-port` and `--api-port`, not `--port` (which is deprecated)
- **Restart Claude Code** after changing MCP configuration

### Second Claude instance fails to connect

If you have multiple Claude Code instances and one fails:

1. Check if daemon is running: `npx @react-component-selector-mcp/cli status`
2. If not running, the first instance may have crashed - restart it
3. Ensure all instances use the same port configuration
4. Try stopping and restarting: `npx @react-component-selector-mcp/cli stop`

### Source location not available

- Ensure source maps are enabled in your build configuration
- Development mode typically has better source map support

### Selection mode not activating

- Check browser console for errors
- Ensure the keyboard shortcut isn't captured by another extension
- Try clicking in the page first to ensure it has focus

## Architecture

The MCP server uses a **daemon architecture** that enables multiple Claude Code instances to share component selections:

```
┌─────────────────┐     ┌─────────────────┐
│  Claude #1      │     │  Claude #2      │
│  (MCP Client)   │     │  (MCP Client)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ HTTP API (port 3334)
              ┌──────▼──────┐
              │   Daemon    │  ← Single shared instance
              │  (Storage)  │
              └──────┬──────┘
                     │ WebSocket (port 3333)
              ┌──────▼──────┐
              │   Browser   │
              │  (React)    │
              └─────────────┘
```

### How It Works

1. **First Claude instance** runs `mcp` command → starts the daemon automatically
2. **Additional Claude instances** detect the running daemon and connect to it
3. **All instances share** the same selection history and receive the same selections
4. **Daemon persists** until explicitly stopped or system restart

### Multiple Claude Instances

When you have multiple Claude Code instances open:

- All instances see the **same** `get_selected_component` result
- All instances share the **same** `get_selection_history`
- If multiple instances call `wait_for_selection`, **all receive** the next selection

This is useful when working on the same project in multiple terminals.

## CLI Commands

### Start MCP Server (Recommended)

```bash
npx @react-component-selector-mcp/cli mcp
```

This auto-starts the daemon if needed and connects Claude Code to it.

### Check Status

```bash
npx @react-component-selector-mcp/cli status
```

Shows daemon status, connected browsers, and selection count.

### Stop Daemon

```bash
npx @react-component-selector-mcp/cli stop
```

### Run Daemon Directly

For debugging or manual control:

```bash
npx @react-component-selector-mcp/cli daemon
```

### Custom Ports

```bash
# MCP with custom ports
npx @react-component-selector-mcp/cli mcp --ws-port 4444 --api-port 4445

# Daemon with custom ports
npx @react-component-selector-mcp/cli daemon --ws-port 4444 --api-port 4445
```

Remember to update `ComponentPicker` to match:

```tsx
<ComponentPicker port={4444}>{children}</ComponentPicker>
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

[MIT](LICENSE)
