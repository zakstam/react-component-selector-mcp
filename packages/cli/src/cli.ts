#!/usr/bin/env node

import { Command } from 'commander';
import { DaemonServer } from './server/daemon.js';
import { MCPClientServer } from './server/mcp-client.js';
import { DaemonClient } from './client/daemon-client.js';
import { ensureDaemonRunning, stopDaemonProcess } from './daemon-launcher.js';
import { isDaemonRunning, readPortsFile } from './utils/pid.js';

const DEFAULT_WS_PORT = 3333;
const DEFAULT_API_PORT = 3334;

const program = new Command();

program
  .name('react-component-selector-mcp')
  .description('CLI and MCP server for React component selection')
  .version('0.0.1');

// ============================================================================
// DAEMON COMMAND - Start the shared daemon server
// ============================================================================
program
  .command('daemon')
  .description('Start the daemon server (WebSocket + HTTP API)')
  .option('--ws-port <port>', 'WebSocket port for browser connections', String(DEFAULT_WS_PORT))
  .option('--api-port <port>', 'HTTP API port for MCP clients', String(DEFAULT_API_PORT))
  .action(async (options) => {
    const wsPort = parseInt(options.wsPort, 10);
    const apiPort = parseInt(options.apiPort, 10);

    // Check if already running
    if (await isDaemonRunning()) {
      const ports = await readPortsFile();
      console.error(`[daemon] Already running (ws:${ports?.wsPort}, api:${ports?.apiPort})`);
      process.exit(1);
    }

    const daemon = new DaemonServer({ wsPort, apiPort });

    try {
      await daemon.start();
      console.log('[daemon] Daemon started successfully');
      console.log(`[daemon] WebSocket: ws://localhost:${wsPort}`);
      console.log(`[daemon] HTTP API: http://localhost:${apiPort}`);
      console.log('[daemon] Press Ctrl+C to stop');

      // Keep process alive
      process.stdin.resume();
    } catch (error) {
      console.error('[daemon] Failed to start:', error);
      process.exit(1);
    }
  });

// ============================================================================
// MCP COMMAND - Start MCP server (thin client, auto-starts daemon)
// ============================================================================
program
  .command('mcp')
  .description('Start MCP server mode for Claude Code integration (auto-starts daemon)')
  .option('--ws-port <port>', 'WebSocket port (if starting daemon)', String(DEFAULT_WS_PORT))
  .option('--api-port <port>', 'HTTP API port to connect to', String(DEFAULT_API_PORT))
  .action(async (options) => {
    const wsPort = parseInt(options.wsPort, 10);
    const apiPort = parseInt(options.apiPort, 10);

    try {
      // Ensure daemon is running, start if needed
      await ensureDaemonRunning({ wsPort, apiPort });

      // Start MCP client server
      const mcpServer = new MCPClientServer({ apiPort });
      await mcpServer.start();

      // Keep process alive
      process.stdin.resume();
    } catch (error) {
      console.error('[mcp] Failed to start:', error);
      process.exit(1);
    }
  });

// ============================================================================
// STATUS COMMAND - Show daemon status
// ============================================================================
program
  .command('status')
  .description('Show daemon status')
  .option('--api-port <port>', 'HTTP API port', String(DEFAULT_API_PORT))
  .action(async (options) => {
    const apiPort = parseInt(options.apiPort, 10);
    const client = new DaemonClient(apiPort);

    try {
      if (!(await client.isRunning())) {
        console.log('Daemon: Not running');
        return;
      }

      const status = await client.getStatus();
      console.log('Daemon: Running');
      console.log(`  WebSocket port: ${status.wsPort}`);
      console.log(`  API port: ${status.apiPort}`);
      console.log(`  Connected browsers: ${status.connectedBrowsers}`);
      console.log(`  Selections stored: ${status.selectionCount}`);
      console.log(`  Uptime: ${Math.floor(status.uptime / 1000)}s`);
    } catch (error) {
      console.log('Daemon: Not running');
    }
  });

// ============================================================================
// STOP COMMAND - Stop the daemon
// ============================================================================
program
  .command('stop')
  .description('Stop the daemon')
  .action(async () => {
    console.log('Stopping daemon...');

    const stopped = await stopDaemonProcess();
    if (stopped) {
      console.log('Daemon stopped');
    } else {
      console.log('Daemon was not running');
    }
  });

// ============================================================================
// START COMMAND (Legacy - deprecated)
// ============================================================================
program
  .command('start')
  .description('[DEPRECATED] Use "daemon" or "mcp" instead')
  .option('-p, --port <port>', 'WebSocket port', String(DEFAULT_WS_PORT))
  .option('--mcp', 'Start MCP server mode')
  .action(async (options) => {
    console.warn('[DEPRECATED] "start" command is deprecated.');

    if (options.mcp) {
      console.warn('Use "mcp" command instead: react-component-selector-mcp mcp');
      // Run mcp command
      const wsPort = parseInt(options.port, 10);
      try {
        await ensureDaemonRunning({ wsPort, apiPort: DEFAULT_API_PORT });
        const mcpServer = new MCPClientServer({ apiPort: DEFAULT_API_PORT });
        await mcpServer.start();
        process.stdin.resume();
      } catch (error) {
        console.error('[mcp] Failed to start:', error);
        process.exit(1);
      }
    } else {
      console.warn('Use "daemon" command instead: react-component-selector-mcp daemon');
      // Run daemon command
      const wsPort = parseInt(options.port, 10);
      const daemon = new DaemonServer({ wsPort, apiPort: DEFAULT_API_PORT });
      try {
        await daemon.start();
        process.stdin.resume();
      } catch (error) {
        console.error('[daemon] Failed to start:', error);
        process.exit(1);
      }
    }
  });

program.parse();
