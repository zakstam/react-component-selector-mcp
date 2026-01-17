---
"@react-component-selector-mcp/react": patch
---

Fix WebSocket connection errors and improve selection UI

- Fix "WebSocket closed before connection established" error on project load (React Strict Mode)
- Suppress console spam when MCP server is not running
- Move selection mode message from top bar to status button (less intrusive)
- Add ESC hint to status button during selection mode
