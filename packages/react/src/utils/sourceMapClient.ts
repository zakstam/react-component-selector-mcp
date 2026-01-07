/**
 * Source map client for fetching and parsing source maps from dev servers
 * Uses source-map-js for browser-compatible source map parsing
 */

import { SourceMapConsumer, type RawSourceMap } from 'source-map-js';

export interface OriginalPosition {
  source: string | null;
  line: number | null;
  column: number | null;
  name: string | null;
}

// Cache for source map consumers (keyed by script URL)
const sourceMapCache = new Map<string, SourceMapConsumer | null>();

// Cache for failed fetches to avoid repeated attempts
const failedFetches = new Set<string>();

/**
 * Fetch and parse a source map for a given script URL
 */
export async function fetchSourceMap(
  scriptUrl: string
): Promise<SourceMapConsumer | null> {
  // Check cache first
  if (sourceMapCache.has(scriptUrl)) {
    return sourceMapCache.get(scriptUrl) || null;
  }

  // Skip if we already failed to fetch this one
  if (failedFetches.has(scriptUrl)) {
    return null;
  }

  try {
    // Try to find the source map URL
    const sourceMapUrl = await findSourceMapUrl(scriptUrl);
    if (!sourceMapUrl) {
      failedFetches.add(scriptUrl);
      sourceMapCache.set(scriptUrl, null);
      return null;
    }

    // Fetch the source map
    const response = await fetch(sourceMapUrl);
    if (!response.ok) {
      failedFetches.add(scriptUrl);
      sourceMapCache.set(scriptUrl, null);
      return null;
    }

    const sourceMapData = (await response.json()) as RawSourceMap;

    // Create the consumer
    const consumer = new SourceMapConsumer(sourceMapData);
    sourceMapCache.set(scriptUrl, consumer);
    return consumer;
  } catch (error) {
    console.debug('[component-picker] Failed to fetch source map:', error);
    failedFetches.add(scriptUrl);
    sourceMapCache.set(scriptUrl, null);
    return null;
  }
}

/**
 * Find the source map URL for a script
 * Tries multiple strategies:
 * 1. Fetch script and look for //# sourceMappingURL comment
 * 2. Try common source map URL patterns
 */
async function findSourceMapUrl(scriptUrl: string): Promise<string | null> {
  try {
    // Strategy 1: Fetch the script and look for sourceMappingURL
    const scriptResponse = await fetch(scriptUrl);
    if (scriptResponse.ok) {
      const scriptContent = await scriptResponse.text();

      // Look for sourceMappingURL comment
      const match = scriptContent.match(
        /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)/
      );
      if (match?.[1]) {
        const mapUrl = match[1];
        // Handle relative URLs
        if (mapUrl.startsWith('data:')) {
          // Inline source map - not supported yet
          return null;
        }
        return new URL(mapUrl, scriptUrl).href;
      }
    }

    // Strategy 2: Try common patterns
    const patterns = [
      `${scriptUrl}.map`,
      scriptUrl.replace(/\.js$/, '.js.map'),
      scriptUrl.replace(/\.mjs$/, '.mjs.map'),
    ];

    for (const pattern of patterns) {
      try {
        const response = await fetch(pattern, { method: 'HEAD' });
        if (response.ok) {
          return pattern;
        }
      } catch {
        // Continue to next pattern
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve the original position from a bundled position
 */
export async function resolveOriginalPosition(
  scriptUrl: string,
  line: number,
  column: number
): Promise<OriginalPosition | null> {
  const consumer = await fetchSourceMap(scriptUrl);
  if (!consumer) {
    return null;
  }

  try {
    const position = consumer.originalPositionFor({
      line,
      column,
    });

    // source-map-js returns { source: null } when it can't find the position
    if (!position.source) {
      return null;
    }

    return {
      source: position.source,
      line: position.line,
      column: position.column,
      name: position.name ?? null,
    };
  } catch (error) {
    console.debug('[component-picker] Failed to resolve position:', error);
    return null;
  }
}

/**
 * Resolve source path to an absolute or project-relative path
 */
export function resolveSourcePath(
  sourcePath: string,
  scriptUrl: string
): string {
  // Handle webpack:// protocol
  if (sourcePath.startsWith('webpack://')) {
    // Format: webpack://package-name/./src/file.tsx
    // or: webpack:///./src/file.tsx
    const match = sourcePath.match(/webpack:\/\/(?:[^/]+)?\/\.?\/?(.+)/);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Handle turbopack paths
  if (sourcePath.startsWith('[project]/')) {
    return sourcePath.replace('[project]/', '');
  }

  // Handle relative paths
  if (sourcePath.startsWith('./') || sourcePath.startsWith('../')) {
    try {
      // Resolve relative to script URL's directory
      const scriptDir = scriptUrl.substring(0, scriptUrl.lastIndexOf('/'));
      const resolved = new URL(sourcePath, scriptDir + '/').pathname;
      // Remove leading slash for consistency
      return resolved.replace(/^\//, '');
    } catch {
      return sourcePath;
    }
  }

  // Handle absolute paths that start with /
  if (sourcePath.startsWith('/')) {
    return sourcePath.substring(1);
  }

  return sourcePath;
}

/**
 * Clear the source map cache
 * Useful for HMR scenarios where source maps may have changed
 */
export function clearSourceMapCache(): void {
  sourceMapCache.clear();
  failedFetches.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { cached: number; failed: number } {
  return {
    cached: sourceMapCache.size,
    failed: failedFetches.size,
  };
}

/**
 * Search source maps for a component definition by name
 * This is a heuristic approach when _debugSource isn't available
 */
export async function searchSourceMapsForComponent(
  componentName: string
): Promise<{ source: string; line: number; column: number } | null> {
  // Get all script URLs from the page
  const scripts = Array.from(document.querySelectorAll('script[src]'))
    .map((s) => (s as HTMLScriptElement).src)
    .filter((src) => src && !src.includes('node_modules'));

  // Also check for Next.js chunks
  const nextScripts = Array.from(
    document.querySelectorAll('script[src*="/_next/"]')
  ).map((s) => (s as HTMLScriptElement).src);

  const allScripts = [...new Set([...scripts, ...nextScripts])];

  for (const scriptUrl of allScripts) {
    const consumer = await fetchSourceMap(scriptUrl);
    if (!consumer) continue;

    // Search through all sources in this source map
    const sources = (consumer as unknown as { sources: string[] }).sources || [];

    for (const source of sources) {
      // Check if this source file might contain the component
      // Look for patterns like "Card.tsx", "Card.jsx", etc.
      const fileName = source.split('/').pop() || '';
      const baseName = fileName.replace(/\.(tsx?|jsx?)$/, '');

      if (
        baseName === componentName ||
        fileName.toLowerCase().includes(componentName.toLowerCase())
      ) {
        // Try to find the component definition in this source
        // Look for "function ComponentName" or "const ComponentName"
        try {
          // Get all mappings for this source
          let firstMapping: { line: number; column: number } | null = null;

          consumer.eachMapping((mapping) => {
            if (mapping.source === source && !firstMapping) {
              // Check if this mapping has the component name
              if (mapping.name === componentName && mapping.originalLine !== null && mapping.originalColumn !== null) {
                firstMapping = {
                  line: mapping.originalLine,
                  column: mapping.originalColumn,
                };
              }
            }
          });

          if (firstMapping !== null) {
            return {
              source: resolveSourcePath(source, scriptUrl),
              line: (firstMapping as { line: number; column: number }).line,
              column: (firstMapping as { line: number; column: number }).column,
            };
          }

          // If no exact name match, return the start of the file that matches the name
          if (baseName === componentName) {
            return {
              source: resolveSourcePath(source, scriptUrl),
              line: 1,
              column: 0,
            };
          }
        } catch {
          // Continue to next source
        }
      }
    }
  }

  return null;
}
