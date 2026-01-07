/**
 * Re-exported types for public API
 * These are inlined to avoid dependency on the private shared package
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

// WebSocket message types for public API
export type MessageType =
  | 'selection'
  | 'ping'
  | 'pong'
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'selectionMode';

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface SelectionMessage extends BaseMessage {
  type: 'selection';
  payload: SelectionData;
}

export interface PingMessage extends BaseMessage {
  type: 'ping';
}

export interface PongMessage extends BaseMessage {
  type: 'pong';
}

export interface ConnectMessage extends BaseMessage {
  type: 'connect';
  payload: {
    clientId: string;
    userAgent?: string;
  };
}

export interface DisconnectMessage extends BaseMessage {
  type: 'disconnect';
  payload: {
    clientId: string;
    reason?: string;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

export interface SelectionModeMessage extends BaseMessage {
  type: 'selectionMode';
  payload: {
    enabled: boolean;
    message?: string;
  };
}

export type WebSocketMessage =
  | SelectionMessage
  | PingMessage
  | PongMessage
  | ConnectMessage
  | DisconnectMessage
  | ErrorMessage
  | SelectionModeMessage;
