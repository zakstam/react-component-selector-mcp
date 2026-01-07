---
"@react-component-selector-mcp/react": major
"@react-component-selector-mcp/cli": major
"@react-component-selector-mcp/shared": major
---

Remove screenshot capture and source map fetching

**Breaking Changes:**

- `SelectionData` type no longer includes `screenshot` field
- `get_selection_history` MCP tool no longer accepts `includeScreenshots` parameter
- Removed exports: `captureScreenshot`, `CaptureOptions`, `clearSourceMapCache`, `getCacheStats`

**What's Changed:**

- Removed `html-to-image` dependency (~50KB savings)
- Removed `source-map-js` dependency (~30KB savings)
- Source location now uses React's `_debugSource` only (faster, no network requests)
- Stack trace parsing remains as fallback for source location

**Migration:**

If you were using the `screenshot` field from `SelectionData`, it is no longer available.
If you were passing `includeScreenshots` to `get_selection_history`, remove that parameter.
