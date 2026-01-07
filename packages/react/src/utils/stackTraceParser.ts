/**
 * Cross-browser stack trace parser
 * Extracts source locations from JavaScript error stack traces
 */

export interface StackFrame {
  functionName: string | null;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Parse an error stack trace into structured frames
 * Supports Chrome, Firefox, Safari, and Edge
 */
export function parseStackTrace(error: Error): StackFrame[] {
  const stack = error.stack;
  if (!stack) return [];

  const frames: StackFrame[] = [];
  const lines = stack.split('\n');

  for (const line of lines) {
    const frame = parseStackLine(line);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Parse a single stack trace line
 */
function parseStackLine(line: string): StackFrame | null {
  // Chrome/Edge/Node format:
  // "    at FunctionName (http://localhost:3000/file.js:10:15)"
  // "    at http://localhost:3000/file.js:10:15"
  // "    at async FunctionName (http://localhost:3000/file.js:10:15)"
  const chromeMatch = line.match(
    /^\s*at\s+(?:async\s+)?(?:(\S+)\s+)?\(?(https?:\/\/[^)]+|file:\/\/[^)]+):(\d+):(\d+)\)?/
  );
  if (chromeMatch) {
    return {
      functionName: chromeMatch[1] || null,
      url: chromeMatch[2]!,
      lineNumber: parseInt(chromeMatch[3]!, 10),
      columnNumber: parseInt(chromeMatch[4]!, 10),
    };
  }

  // Firefox/Safari format:
  // "functionName@http://localhost:3000/file.js:10:15"
  // "@http://localhost:3000/file.js:10:15"
  const firefoxMatch = line.match(
    /^(?:(\S*)@)?(https?:\/\/[^:]+|file:\/\/[^:]+):(\d+):(\d+)/
  );
  if (firefoxMatch) {
    return {
      functionName: firefoxMatch[1] || null,
      url: firefoxMatch[2]!,
      lineNumber: parseInt(firefoxMatch[3]!, 10),
      columnNumber: parseInt(firefoxMatch[4]!, 10),
    };
  }

  return null;
}

/**
 * Filter out internal React and framework frames
 */
export function filterInternalFrames(frames: StackFrame[]): StackFrame[] {
  const internalPatterns = [
    /node_modules/,
    /react-dom/,
    /react\.production/,
    /react\.development/,
    /scheduler/,
    /\/_next\/static\/chunks\/webpack/,
    /\/__webpack_/,
    /\/turbopack-/,
    // React internal function names
    /^(?:renderWithHooks|mountIndeterminateComponent|beginWork|performUnitOfWork)/,
    /^(?:callCallback|invokeGuardedCallbackDev|invokeGuardedCallback)/,
    /^(?:commitRoot|flushSync|batchedUpdates)/,
  ];

  return frames.filter((frame) => {
    // Check URL patterns
    for (const pattern of internalPatterns) {
      if (pattern.test(frame.url)) {
        return false;
      }
    }

    // Check function name patterns
    if (frame.functionName) {
      for (const pattern of internalPatterns) {
        if (pattern.test(frame.functionName)) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Get the first user component frame from the stack
 * This is typically the component that was clicked
 */
export function getComponentFrame(frames: StackFrame[]): StackFrame | null {
  const userFrames = filterInternalFrames(frames);
  return userFrames[0] || null;
}

/**
 * Create a stack trace at the current execution point
 * Useful for capturing where a component render is happening
 */
export function captureStackTrace(): StackFrame[] {
  const error = new Error();
  return parseStackTrace(error);
}

/**
 * Extract the script URL from a frame, normalizing various bundler formats
 */
export function normalizeScriptUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query params (like HMR timestamps)
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.href;
  } catch {
    return url;
  }
}
