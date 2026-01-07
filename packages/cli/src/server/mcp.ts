import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { SelectionData } from '../types.js';
import { SelectionStorage } from './storage.js';
import { WebSocketServer } from './websocket.js';

export interface MCPServerOptions {
  storage: SelectionStorage;
  wsServer: WebSocketServer;
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

export class MCPServer {
  private server: Server;
  private storage: SelectionStorage;
  private wsServer: WebSocketServer;

  constructor(options: MCPServerOptions) {
    this.storage = options.storage;
    this.wsServer = options.wsServer;

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
            'Returns the most recently selected React component. Use after user has made a selection in the browser using Cmd+Shift+S.',
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

  private handleGetSelectedComponent() {
    const selection = this.storage.getLatest();

    if (!selection) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'No component selected yet',
              hint: 'User should press Cmd+Shift+S in the browser and click a component',
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
  }

  private async handleWaitForSelection(args: unknown) {
    const params = WaitForSelectionParamsSchema.parse(args ?? {});

    // Trigger selection mode in browser
    this.wsServer.triggerSelectionMode(true, params.triggerMessage);

    try {
      const selection = await this.storage.waitForSelection(params.timeout);

      // Disable selection mode after successful selection
      this.wsServer.triggerSelectionMode(false);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.formatSelectionForOutput(selection), null, 2),
          },
        ],
      };
    } catch (error) {
      // Disable selection mode on timeout
      this.wsServer.triggerSelectionMode(false);

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

  private handleGetSelectionHistory(args: unknown) {
    const params = GetSelectionHistoryParamsSchema.parse(args ?? {});
    const history = this.storage.getHistory(params.limit, params.includeScreenshots);

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
    console.error('[component-picker] MCP server started');
  }
}
