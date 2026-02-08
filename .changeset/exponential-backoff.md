---
"@react-component-selector-mcp/react": patch
---

Use exponential backoff for WebSocket reconnection (1s to 30s) to reduce console noise when the server is unavailable. Log a friendly warning on connection failure instead of failing silently.
