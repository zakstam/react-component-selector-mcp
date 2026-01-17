# @react-component-selector-mcp/react

## 2.0.3

### Patch Changes

- fba2c07: Update README with screenshot and Claude Code setup prompt

## 2.0.2

### Patch Changes

- 5702227: Add README to npm package

## 2.0.1

### Patch Changes

- 1675271: Fix WebSocket connection errors and improve selection UI

  - Fix "WebSocket closed before connection established" error on project load (React Strict Mode)
  - Suppress console spam when MCP server is not running
  - Move selection mode message from top bar to status button (less intrusive)
  - Add ESC hint to status button during selection mode

## 2.0.0

### Major Changes

- 41af7ac: Remove screenshot capture and source map fetching

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

## 1.1.0

### Minor Changes

- 78bb384: Fixed an issue with web fonts and updated the documentation

## 1.0.0

### Major Changes

- Initial Release
