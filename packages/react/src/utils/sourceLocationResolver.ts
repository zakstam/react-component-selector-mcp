/**
 * Source location resolver
 *
 * Attempts to resolve source file locations using two strategies:
 * 1. React's _debugSource (fastest, works with Babel-based builds)
 * 2. Stack trace parsing (fallback, less accurate)
 */

import type { SourceLocation } from '@react-component-selector-mcp/shared';
import { parseStackTrace, filterInternalFrames } from './stackTraceParser.js';

export interface DebugSource {
  fileName: string | null;
  lineNumber: number | null;
  columnNumber?: number | null;
}

export interface Fiber {
  _debugSource?: DebugSource;
  type?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Resolve source location using multiple strategies
 * This is the main entry point for source resolution
 */
export async function resolveSourceLocation(
  fiber: Fiber | null,
  _element?: HTMLElement
): Promise<SourceLocation> {
  // Strategy 1: Try _debugSource first (fastest)
  const debugSourceResult = tryDebugSource(fiber);
  if (debugSourceResult.filePath) {
    return debugSourceResult;
  }

  // Strategy 2: Try stack trace parsing (fallback)
  const stackResult = tryStackTraceParsing();
  if (stackResult?.filePath) {
    return stackResult;
  }

  // No source information available
  return {
    filePath: null,
    lineNumber: null,
    columnNumber: null,
  };
}

/**
 * Strategy 1: Extract source from React's _debugSource
 * This is set by @babel/plugin-transform-react-jsx-source
 */
function tryDebugSource(fiber: Fiber | null): SourceLocation {
  if (!fiber?._debugSource) {
    return { filePath: null, lineNumber: null, columnNumber: null };
  }

  const { fileName, lineNumber, columnNumber } = fiber._debugSource;

  if (!fileName) {
    return { filePath: null, lineNumber: null, columnNumber: null };
  }

  return {
    filePath: formatFilePath(fileName),
    lineNumber: lineNumber ?? null,
    columnNumber: columnNumber ?? null,
  };
}

/**
 * Strategy 2: Parse stack trace directly for source location
 * Less accurate but works as a last resort
 */
function tryStackTraceParsing(): SourceLocation | null {
  try {
    const error = new Error();
    const frames = parseStackTrace(error);
    const userFrames = filterInternalFrames(frames);

    if (userFrames.length === 0) {
      return null;
    }

    const frame = userFrames[0]!;

    // Extract file path from URL
    const filePath = extractFilePathFromUrl(frame.url);
    if (!filePath) {
      return null;
    }

    return {
      filePath,
      lineNumber: frame.lineNumber,
      columnNumber: frame.columnNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Extract relative file path from URL
 */
function extractFilePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    let path = urlObj.pathname;

    // Remove leading slash
    path = path.replace(/^\/+/, '');

    // Handle various bundler prefixes
    path = path
      // Next.js
      .replace(/^_next\/static\/chunks\//, '')
      .replace(/^_next\/static\/[^/]+\/pages\//, 'pages/')
      // Vite
      .replace(/^\/@fs\//, '')
      .replace(/^@vite\//, '')
      // Webpack
      .replace(/^webpack:\/\/[^/]+\//, '')
      // Turbopack
      .replace(/^\[project\]\//, '');

    // Remove query params and hash (HMR timestamps etc)
    path = path.split('?')[0]?.split('#')[0] || path;

    // If the path looks like a hash (e.g., "app-pages-internals.js")
    // and doesn't have a recognizable extension path, it's not useful
    if (!path.includes('/') && !path.match(/\.(tsx?|jsx?|mjs)$/)) {
      return null;
    }

    return path || null;
  } catch {
    return url;
  }
}

/**
 * Clean up file path for display
 */
export function formatFilePath(filePath: string | null): string | null {
  if (!filePath) return null;

  let cleaned = filePath
    // Remove webpack:// prefix
    .replace(/^webpack:\/\/[^/]+\//, '')
    // Remove ./ prefix
    .replace(/^\.\//g, '')
    // Remove leading slashes
    .replace(/^\/+/, '')
    // Remove turbopack prefix
    .replace(/^\[project\]\//, '');

  // Normalize Windows paths to forward slashes
  cleaned = cleaned.replace(/\\/g, '/');

  return cleaned;
}

/**
 * Synchronous version for backward compatibility
 * Only uses _debugSource strategy
 */
export function resolveSourceLocationSync(
  debugSource: DebugSource | null
): SourceLocation {
  if (!debugSource?.fileName) {
    return { filePath: null, lineNumber: null, columnNumber: null };
  }

  return {
    filePath: formatFilePath(debugSource.fileName),
    lineNumber: debugSource.lineNumber ?? null,
    columnNumber: debugSource.columnNumber ?? null,
  };
}
