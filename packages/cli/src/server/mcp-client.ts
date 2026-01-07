import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { SelectionData } from '../types.js';
import { DaemonClient } from '../client/daemon-client.js';

export interface MCPClientServerOptions {
  apiPort: number;
}

// Tool parameter schemas
const WaitForSelectionParamsSchema = z.object({
  timeout: z.number().optional().default(60000),
  triggerMessage: z.string().optional(),
});

const GetSelectionHistoryParamsSchema = z.object({
  limit: z.number().optional().default(10),
  includeScreenshots: z.boolean().optional().default(false),
});

/**
 * Thin MCP server that delegates to the daemon via HTTP API.
 * Multiple instances can run simultaneously, all sharing the same daemon.
 */
export class MCPClientServer {
  private server: Server;
  private client: DaemonClient;

  constructor(options: MCPClientServerOptions) {
    this.client = new DaemonClient(options.apiPort);

    this.server = new Server(
      {
        name: 'react-component-selector-mcp',
        version: '0.0.1',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_selected_component',
          description:
            'Returns the most recently selected React component. Use after user has made a selection in the browser using Ctrl+Alt+C.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'wait_for_selection',
          description:
            'Blocks until user selects a component in the browser (or timeout). Use when you need to wait for user to pick a component. Optionally shows a message to guide the user.',
          inputSchema: {
            type: 'object',
            properties: {
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds (default: 60000)',
              },
              triggerMessage: {
                type: 'string',
                description: 'Optional message to show the user',
              },
            },
            required: [],
          },
        },
        {
          name: 'get_selection_history',
          description:
            'Returns recent component selections for reviewing multiple components.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of selections to return (default: 10)',
              },
              includeScreenshots: {
                type: 'boolean',
                description: 'Whether to include screenshot data (default: false)',
              },
            },
            required: [],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_selected_component':
          return this.handleGetSelectedComponent();

        case 'wait_for_selection':
          return this.handleWaitForSelection(args);

        case 'get_selection_history':
          return this.handleGetSelectionHistory(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleGetSelectedComponent() {
    try {
      const selection = await this.client.getLatestSelection();

      if (!selection) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'No component selected yet',
                hint: 'User should press Ctrl+Alt+C in the browser and click a component',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.formatSelectionForOutput(selection), null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to get selection',
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  }

  private async handleWaitForSelection(args: unknown) {
    const params = WaitForSelectionParamsSchema.parse(args ?? {});

    try {
      const selection = await this.client.waitForSelection(
        params.timeout,
        params.triggerMessage
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.formatSelectionForOutput(selection), null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Selection timeout',
              message: 'User did not select a component within the timeout period',
            }),
          },
        ],
      };
    }
  }

  private async handleGetSelectionHistory(args: unknown) {
    const params = GetSelectionHistoryParamsSchema.parse(args ?? {});

    try {
      const history = await this.client.getHistory(params.limit, params.includeScreenshots);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                count: history.length,
                selections: history.map((s) => this.formatSelectionForOutput(s)),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to get history',
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  }

  private formatSelectionForOutput(selection: SelectionData) {
    return {
      id: selection.id,
      timestamp: selection.timestamp,
      component: selection.component,
      source: selection.source,
      props: selection.props,
      state: selection.state,
      dom: {
        tagName: selection.dom.tagName,
        className: selection.dom.className,
        dimensions: {
          width: selection.dom.boundingRect.width,
          height: selection.dom.boundingRect.height,
        },
      },
      context: selection.context,
      hasScreenshot: selection.screenshot.dataUrl !== '[omitted]',
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[mcp] MCP client server started (connected to daemon)');
  }
}
