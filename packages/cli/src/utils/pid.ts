import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.react-component-selector-mcp');
const PID_FILE = path.join(CONFIG_DIR, 'daemon.pid');
const PORT_FILE = path.join(CONFIG_DIR, 'daemon.ports');

export interface DaemonPorts {
  wsPort: number;
  apiPort: number;
}

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function writePidFile(pid: number, ports: DaemonPorts): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(PID_FILE, pid.toString(), 'utf-8');
  await fs.writeFile(PORT_FILE, JSON.stringify(ports), 'utf-8');
}

export async function readPidFile(): Promise<number | null> {
  try {
    const content = await fs.readFile(PID_FILE, 'utf-8');
    return parseInt(content.trim(), 10);
  } catch {
    return null;
  }
}

export async function readPortsFile(): Promise<DaemonPorts | null> {
  try {
    const content = await fs.readFile(PORT_FILE, 'utf-8');
    return JSON.parse(content) as DaemonPorts;
  } catch {
    return null;
  }
}

export async function removePidFile(): Promise<void> {
  try {
    await fs.unlink(PID_FILE);
    await fs.unlink(PORT_FILE);
  } catch {
    // Files don't exist
  }
}

export async function isDaemonRunning(): Promise<boolean> {
  const pid = await readPidFile();
  if (!pid) return false;

  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    // Process doesn't exist, clean up stale PID file
    await removePidFile();
    return false;
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
