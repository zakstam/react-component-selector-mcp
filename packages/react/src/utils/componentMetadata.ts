import { nanoid } from 'nanoid';
import type { SelectionData, DOMInfo } from '@react-component-selector-mcp/shared';
import type { FiberData } from '../hooks/useFiberInspector.js';
import {
  resolveSourceLocation,
  formatFilePath,
  type Fiber,
} from './sourceLocationResolver.js';

export interface MetadataOptions {
  /** The raw React fiber for enhanced source resolution */
  fiber?: Fiber | null;
}

/**
 * Extract DOM information from an element
 */
export function extractDOMInfo(element: HTMLElement): DOMInfo {
  const rect = element.getBoundingClientRect();

  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className || null,
    boundingRect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    },
  };
}

/**
 * Build complete selection data from fiber data and DOM element
 */
export async function buildSelectionData(
  element: HTMLElement,
  fiberData: FiberData,
  options: MetadataOptions = {}
): Promise<SelectionData> {
  // Resolve source location using multi-strategy approach
  // Pass fiber for enhanced source map resolution
  const fiber = options.fiber ?? {
    _debugSource: fiberData.debugSource,
  };
  const source = await resolveSourceLocation(fiber, element);

  // Build complete selection data
  const selectionData: SelectionData = {
    id: nanoid(),
    timestamp: Date.now(),
    component: fiberData.componentInfo,
    source: {
      filePath: formatFilePath(source.filePath),
      lineNumber: source.lineNumber,
      columnNumber: source.columnNumber,
    },
    props: fiberData.props,
    state: fiberData.state,
    dom: extractDOMInfo(element),
    context: {
      pageUrl: window.location.href,
      parentComponents: fiberData.parentComponents,
    },
  };

  return selectionData;
}
