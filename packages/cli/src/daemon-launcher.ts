import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DaemonClient } from './client/daemon-client.js';
import { isDaemonRunning, readPidFile, readPortsFile } from './utils/pid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CLI entry point
const CLI_PATH = path.join(__dirname, 'cli.js');

export interface LaunchOptions {
  wsPort: number;
  apiPort: number;
}

export async function startDaemonProcess(options: LaunchOptions): Promise<void> {
  // Check if already running
  if (await isDaemonRunning()) {
    const ports = await readPortsFile();
    if (ports?.wsPort === options.wsPort && ports?.apiPort === options.apiPort) {
      console.error('[launcher] Daemon already running with same ports');
      return;
    }
    throw new Error(
      `Daemon already running on different ports (ws:${ports?.wsPort}, api:${ports?.apiPort})`
    );
  }

  console.error(`[launcher] Starting daemon (ws:${options.wsPort}, api:${options.apiPort})...`);

  // Spawn daemon as detached process
  const child = spawn(
    process.execPath,
    [CLI_PATH, 'daemon', '--ws-port', String(options.wsPort), '--api-port', String(options.apiPort)],
    {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        DAEMON_CHILD: '1', // Mark as spawned child
      },
    }
  );

  child.unref();

  // Wait for daemon to be ready
  await waitForDaemon(options.apiPort);

  console.error('[launcher] Daemon started successfully');
}

export async function stopDaemonProcess(): Promise<boolean> {
  const pid = await readPidFile();
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');

    // Wait for process to exit
    let attempts = 0;
    while (attempts < 50) { // 5 seconds max
      await sleep(100);
      try {
        process.kill(pid, 0);
        attempts++;
      } catch {
        // Process exited
        return true;
      }
    }

    // Force kill if still running
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Already dead
    }
    return true;
  } catch {
    return false;
  }
}

async function waitForDaemon(apiPort: number, maxAttempts: number = 50): Promise<void> {
  const client = new DaemonClient(apiPort);

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(100);
    if (await client.isRunning()) {
      return;
    }
  }

  throw new Error('Daemon failed to start within timeout');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDaemonRunning(options: LaunchOptions): Promise<DaemonClient> {
  const client = new DaemonClient(options.apiPort);

  if (await client.isRunning()) {
    return client;
  }

  await startDaemonProcess(options);
  return client;
}
