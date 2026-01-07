import http from 'node:http';
import type { SelectionData } from '../types.js';

export interface DaemonStatus {
  running: boolean;
  wsPort: number;
  apiPort: number;
  connectedBrowsers: number;
  selectionCount: number;
  uptime: number;
}

export class DaemonClient {
  private apiPort: number;

  constructor(apiPort: number = 3334) {
    this.apiPort = apiPort;
  }

  async isRunning(): Promise<boolean> {
    try {
      await this.request('GET', '/health');
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<DaemonStatus> {
    const response = await this.request('GET', '/status');
    return response as DaemonStatus;
  }

  async getLatestSelection(): Promise<SelectionData | null> {
    const response = await this.request('GET', '/selection/latest');
    return (response as { selection: SelectionData | null }).selection;
  }

  async getHistory(limit: number = 10): Promise<SelectionData[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });
    const response = await this.request('GET', `/selection/history?${params}`);
    return (response as { selections: SelectionData[] }).selections;
  }

  async waitForSelection(timeout: number = 60000, triggerMessage?: string): Promise<SelectionData> {
    const response = await this.request(
      'POST',
      '/selection/wait',
      { timeout, triggerMessage },
      timeout + 5000 // HTTP timeout slightly longer than selection timeout
    );

    const result = response as { selection?: SelectionData; error?: string };
    if (result.error) {
      throw new Error(result.error);
    }
    return result.selection!;
  }

  async triggerSelectionMode(enabled: boolean, message?: string): Promise<void> {
    await this.request('POST', '/selection-mode', { enabled, message });
  }

  private request(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    timeout: number = 10000
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: this.apiPort,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }
}
