/**
 * Core types for react-component-selector-mcp
 */

export type ComponentType = 'function' | 'class' | 'forwardRef' | 'memo';

export interface ComponentInfo {
  name: string;
  type: ComponentType;
}

export interface SourceLocation {
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
}

export interface DOMInfo {
  tagName: string;
  className: string | null;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface Screenshot {
  dataUrl: string;
  width: number;
  height: number;
}

export interface SelectionContext {
  pageUrl: string;
  parentComponents: string[];
}

export interface SelectionData {
  id: string;
  timestamp: number;
  component: ComponentInfo;
  source: SourceLocation;
  props: Record<string, unknown>;
  state: Record<string, unknown> | null;
  dom: DOMInfo;
  screenshot: Screenshot;
  context: SelectionContext;
}

export interface ConnectionStatus {
  connected: boolean;
  clientCount: number;
  lastPing?: number;
}
