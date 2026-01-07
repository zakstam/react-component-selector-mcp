import { WebSocketServer as WSServer, WebSocket as WS } from 'ws';
import { nanoid } from 'nanoid';
import {
  WebSocketMessage as SharedWebSocketMessage,
  WebSocketMessageSchema,
  SelectionMessage,
  createMessage,
} from '@react-component-selector-mcp/shared';
import type { SelectionData, WebSocketMessage } from '../types.js';

// Internal type alias for compatibility
type InternalMessage = SharedWebSocketMessage;

export interface WebSocketServerOptions {
  port: number;
  onSelection?: (data: SelectionData) => void;
  onClientConnect?: (clientId: string) => void;
  onClientDisconnect?: (clientId: string) => void;
}

interface Client {
  id: string;
  ws: WS;
  lastPing: number;
}

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients = new Map<string, Client>();
  private options: WebSocketServerOptions;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: WebSocketServerOptions) {
    this.options = options;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WSServer({ port: this.options.port });

        this.wss.on('listening', () => {
          console.log(`[component-picker] WebSocket server listening on port ${this.options.port}`);
          this.startPingInterval();
          resolve();
        });

        this.wss.on('connection', (ws) => {
          this.handleConnection(ws);
        });

        this.wss.on('error', (error) => {
          console.error('[component-picker] WebSocket server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (this.wss) {
        // Close all client connections
        for (const client of this.clients.values()) {
          client.ws.close(1000, 'Server shutting down');
        }
        this.clients.clear();

        this.wss.close(() => {
          console.log('[component-picker] WebSocket server stopped');
          this.wss = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private handleConnection(ws: WS): void {
    const clientId = nanoid();
    const client: Client = {
      id: clientId,
      ws,
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`[component-picker] Client connected: ${clientId}`);
    this.options.onClientConnect?.(clientId);

    ws.on('message', (data) => {
      this.handleMessage(clientId, data.toString());
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[component-picker] Client disconnected: ${clientId}`);
      this.options.onClientDisconnect?.(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[component-picker] Client ${clientId} error:`, error);
    });

    // Send connection acknowledgment
    this.sendToClient(clientId, createMessage('connect', { clientId }));
  }

  private handleMessage(clientId: string, rawMessage: string): void {
    try {
      const parsed = JSON.parse(rawMessage);
      const result = WebSocketMessageSchema.safeParse(parsed);

      if (!result.success) {
        console.error('[component-picker] Invalid message format:', result.error);
        this.sendToClient(clientId, createMessage('error', {
          code: 'INVALID_MESSAGE',
          message: 'Invalid message format',
        }));
        return;
      }

      const message = result.data;
      const client = this.clients.get(clientId);

      switch (message.type) {
        case 'selection':
          console.log(`[component-picker] Selection received: ${(message as SelectionMessage).payload.component.name}`);
          this.options.onSelection?.((message as SelectionMessage).payload);
          break;

        case 'ping':
          if (client) {
            client.lastPing = Date.now();
          }
          this.sendToClient(clientId, createMessage('pong'));
          break;

        case 'pong':
          if (client) {
            client.lastPing = Date.now();
          }
          break;

        default:
          // Other message types handled as needed
          break;
      }
    } catch (error) {
      console.error('[component-picker] Error parsing message:', error);
    }
  }

  private sendToClient(clientId: string, message: InternalMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WS.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WS.OPEN) {
        client.ws.send(data);
      }
    }
  }

  triggerSelectionMode(enabled: boolean, message?: string): void {
    this.broadcast(createMessage('selectionMode', { enabled, message }));
  }

  private startPingInterval(): void {
    // Ping clients every 30 seconds
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 second timeout

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          console.log(`[component-picker] Client ${clientId} timed out`);
          client.ws.close(1000, 'Ping timeout');
          this.clients.delete(clientId);
        } else if (client.ws.readyState === WS.OPEN) {
          this.sendToClient(clientId, createMessage('ping'));
        }
      }
    }, 30000);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  isRunning(): boolean {
    return this.wss !== null;
  }
}
