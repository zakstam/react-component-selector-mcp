import http from 'node:http';
import type { SelectionData } from '../types.js';
import { SelectionStorage } from './storage.js';
import { WebSocketServer } from './websocket.js';
import { writePidFile, removePidFile } from '../utils/pid.js';

export interface DaemonServerOptions {
  wsPort: number;
  apiPort: number;
}

interface WaitingClient {
  resolve: (data: SelectionData) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export class DaemonServer {
  private httpServer: http.Server | null = null;
  private wsServer: WebSocketServer;
  private storage: SelectionStorage;
  private options: DaemonServerOptions;
  private startTime: number = Date.now();
  private waitingClients: WaitingClient[] = [];

  constructor(options: DaemonServerOptions) {
    this.options = options;
    this.storage = new SelectionStorage();
    this.wsServer = new WebSocketServer({
      port: options.wsPort,
      onSelection: (data) => {
        this.storage.addSelection(data);
        this.notifyWaitingClients(data);
        console.log(`[daemon] Selection stored: ${data.component.name}`);
      },
      onClientConnect: (clientId) => {
        console.log(`[daemon] Browser connected: ${clientId}`);
      },
      onClientDisconnect: (clientId) => {
        console.log(`[daemon] Browser disconnected: ${clientId}`);
      },
    });
  }

  private notifyWaitingClients(data: SelectionData): void {
    for (const client of this.waitingClients) {
      clearTimeout(client.timeoutId);
      client.resolve(data);
    }
    this.waitingClients = [];
  }

  async start(): Promise<void> {
    // Start WebSocket server
    await this.wsServer.start();

    // Start HTTP API server
    await this.startHttpServer();

    // Write PID file
    await writePidFile(process.pid, {
      wsPort: this.options.wsPort,
      apiPort: this.options.apiPort,
    });

    // Setup shutdown handlers
    this.setupShutdownHandlers();

    console.log(`[daemon] HTTP API listening on port ${this.options.apiPort}`);
    console.log(`[daemon] Ready for MCP client connections`);
  }

  private startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.httpServer.on('error', reject);

      this.httpServer.listen(this.options.apiPort, () => {
        resolve();
      });
    });
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://localhost:${this.options.apiPort}`);

    // CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        this.handleHealth(res);
      } else if (req.method === 'GET' && url.pathname === '/status') {
        this.handleStatus(res);
      } else if (req.method === 'GET' && url.pathname === '/selection/latest') {
        this.handleGetLatest(res);
      } else if (req.method === 'GET' && url.pathname === '/selection/history') {
        this.handleGetHistory(url, res);
      } else if (req.method === 'POST' && url.pathname === '/selection/wait') {
        await this.handleWaitForSelection(req, res);
      } else if (req.method === 'POST' && url.pathname === '/selection-mode') {
        await this.handleSelectionMode(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('[daemon] Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private handleHealth(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  }

  private handleStatus(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        running: true,
        wsPort: this.options.wsPort,
        apiPort: this.options.apiPort,
        connectedBrowsers: this.wsServer.getClientCount(),
        selectionCount: this.storage.getCount(),
        uptime: Date.now() - this.startTime,
      })
    );
  }

  private handleGetLatest(res: http.ServerResponse): void {
    const selection = this.storage.getLatest();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ selection }));
  }

  private handleGetHistory(url: URL, res: http.ServerResponse): void {
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const history = this.storage.getHistory(limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ selections: history }));
  }

  private async handleWaitForSelection(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    const timeout = typeof body.timeout === 'number' ? body.timeout : 60000;
    const triggerMessage = typeof body.triggerMessage === 'string' ? body.triggerMessage : undefined;

    // Trigger selection mode in browser
    this.wsServer.triggerSelectionMode(true, triggerMessage);

    try {
      const selection = await this.waitForNextSelection(timeout);
      this.wsServer.triggerSelectionMode(false);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ selection }));
    } catch (error) {
      this.wsServer.triggerSelectionMode(false);

      res.writeHead(408, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Selection timeout' }));
    }
  }

  private waitForNextSelection(timeout: number): Promise<SelectionData> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.waitingClients.findIndex((c) => c.resolve === resolve);
        if (index !== -1) {
          this.waitingClients.splice(index, 1);
        }
        reject(new Error('Selection timeout'));
      }, timeout);

      this.waitingClients.push({ resolve, reject, timeoutId });
    });
  }

  private async handleSelectionMode(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const body = await this.readBody(req);
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : false;
    const message = typeof body.message === 'string' ? body.message : undefined;

    this.wsServer.triggerSelectionMode(enabled, message);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  }

  private readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n[daemon] Received ${signal}, shutting down...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async stop(): Promise<void> {
    // Reject all waiting clients
    for (const client of this.waitingClients) {
      clearTimeout(client.timeoutId);
      client.reject(new Error('Daemon shutting down'));
    }
    this.waitingClients = [];

    // Stop HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }

    // Stop WebSocket server
    await this.wsServer.stop();

    // Remove PID file
    await removePidFile();

    console.log('[daemon] Stopped');
  }
}
