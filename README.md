# React Component Selector MCP

Select React components visually in the browser and expose selection data to Claude Code via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## Quick Start

```bash
# Install packages
npm install @react-component-selector-mcp/react
npm install -g @react-component-selector-mcp/cli
```

## What It Does

- **Visual Selection**: Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac) to enter selection mode
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
         "args": ["@react-component-selector-mcp/cli", "mcp", "--port", "3333"]
       }
     }
   }

4. VERIFY SETUP
   - Start the dev server (npm run dev or equivalent)
   - Open browser to the app
   - Press Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+S (Mac)
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
      "args": ["@react-component-selector-mcp/cli", "mcp", "--port", "3333"]
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
      "args": ["@react-component-selector-mcp/cli", "mcp", "--port", "3333"]
    }
  }
}
```

> **Note**: The port number must match between the React component and CLI configuration.

## Usage

### Select a Component

1. Start your React development server
2. Open your app in the browser
3. Press **Ctrl+Shift+S** (Windows/Linux) or **Cmd+Shift+S** (Mac)
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

- Ensure the CLI is installed: `npx @react-component-selector-mcp/cli --version`
- Check that port 3333 (or your chosen port) is not in use
- Restart Claude Code after changing MCP configuration

### Source location not available

- Ensure source maps are enabled in your build configuration
- Development mode typically has better source map support

### Selection mode not activating

- Check browser console for errors
- Ensure the keyboard shortcut isn't captured by another extension
- Try clicking in the page first to ensure it has focus

## Standalone CLI Mode

Run the WebSocket server without MCP integration:

```bash
npx @react-component-selector-mcp/cli start --port 3333
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

[MIT](LICENSE)
