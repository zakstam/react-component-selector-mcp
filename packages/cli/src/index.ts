// Server components
export { WebSocketServer } from './server/websocket.js';
export { MCPServer } from './server/mcp.js';
export { SelectionStorage } from './server/storage.js';
export { DaemonServer } from './server/daemon.js';
export { MCPClientServer } from './server/mcp-client.js';

// Client components
export { DaemonClient } from './client/daemon-client.js';
export type { DaemonStatus } from './client/daemon-client.js';

// Launcher utilities
export { ensureDaemonRunning, startDaemonProcess, stopDaemonProcess } from './daemon-launcher.js';

// PID utilities
export { isDaemonRunning, readPidFile, readPortsFile, getConfigDir } from './utils/pid.js';
export type { DaemonPorts } from './utils/pid.js';

// Re-export types for public API
export type {
  SelectionData,
  ComponentInfo,
  ComponentType,
  SourceLocation,
  DOMInfo,
  Screenshot,
  SelectionContext,
  WebSocketMessage,
  MessageType,
  SelectionMessage,
  PingMessage,
  PongMessage,
  ConnectMessage,
  DisconnectMessage,
  ErrorMessage,
  SelectionModeMessage,
} from './types.js';
