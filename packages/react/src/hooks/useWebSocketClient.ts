import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WebSocketMessageSchema,
  createMessage,
  type SelectionData,
  type SelectionModeMessage,
} from '@react-component-selector-mcp/shared';

export interface UseWebSocketClientOptions {
  port: number;
  onSelectionModeChange?: (enabled: boolean, message?: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseWebSocketClientReturn {
  connected: boolean;
  sendSelection: (data: SelectionData) => void;
  clientId: string | null;
}

export function useWebSocketClient(
  options: UseWebSocketClientOptions
): UseWebSocketClientReturn {
  const { port } = options;

  // Use refs for callbacks to avoid re-triggering effects
  const onSelectionModeChangeRef = useRef(options.onSelectionModeChange);
  const onConnectionChangeRef = useRef(options.onConnectionChange);
  onSelectionModeChangeRef.current = options.onSelectionModeChange;
  onConnectionChangeRef.current = options.onConnectionChange;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCleaningUpRef = useRef(false);
  // Track if we've ever successfully connected (to suppress initial connection errors)
  const hasConnectedRef = useRef(false);
  // Exponential backoff for reconnection
  const reconnectDelayRef = useRef(1000);
  const MAX_RECONNECT_DELAY = 30000;

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Queue for selections made while disconnected
  const pendingSelectionsRef = useRef<SelectionData[]>([]);

  const flushPendingSelections = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && pendingSelectionsRef.current.length > 0) {
      const pending = pendingSelectionsRef.current.splice(0);
      for (const data of pending) {
        const message = createMessage('selection', data);
        wsRef.current.send(JSON.stringify(message));
      }
      console.log(`[component-picker] Flushed ${pending.length} queued selection(s)`);
    }
  }, []);

  const sendSelection = useCallback((data: SelectionData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = createMessage('selection', data);
      wsRef.current.send(JSON.stringify(message));
    } else {
      pendingSelectionsRef.current.push(data);
      console.log('[component-picker] Selection queued (will send when connected)');
    }
  }, []);

  useEffect(() => {
    // Reset cleanup flag on mount
    isCleaningUpRef.current = false;

    // Prevent running if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Small delay to handle React Strict Mode double-invoke
    // This prevents "WebSocket closed before connection established" errors
    let connectTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || isCleaningUpRef.current) {
        return;
      }

      try {
        const ws = new WebSocket(`ws://localhost:${port}`);
        // Track whether this specific connection was intentionally closed during cleanup
        let wasIntentionallyClosed = false;

        ws.onopen = () => {
          if (isCleaningUpRef.current) {
            wasIntentionallyClosed = true;
            ws.close();
            return;
          }
          hasConnectedRef.current = true;
          reconnectDelayRef.current = 1000; // Reset backoff on successful connection
          console.log('[component-picker] Connected to server');
          setConnected(true);
          onConnectionChangeRef.current?.(true);

          // Flush any selections made while disconnected
          flushPendingSelections();

          // Start ping interval
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(createMessage('ping')));
            }
          }, 25000);
        };

        ws.onclose = () => {
          // Only log disconnection if we were previously connected (not during initial failed attempts)
          if (hasConnectedRef.current && !wasIntentionallyClosed && !isCleaningUpRef.current) {
            console.log('[component-picker] Disconnected from server');
          }
          setConnected(false);
          setClientId(null);
          onConnectionChangeRef.current?.(false);

          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          // Only attempt reconnection if not cleaning up
          if (!isCleaningUpRef.current) {
            const delay = reconnectDelayRef.current;
            reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        };

        ws.onerror = () => {
          // Log a friendly warning instead of letting the browser error speak for itself
          console.warn(`[component-picker] Server not available at ws://localhost:${port}, retrying in ${Math.round(reconnectDelayRef.current / 1000)}s...`);
        };

        ws.onmessage = (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            const result = WebSocketMessageSchema.safeParse(parsed);

            if (!result.success) {
              console.warn('[component-picker] Invalid message:', result.error);
              return;
            }

            const message = result.data;

            switch (message.type) {
              case 'connect':
                setClientId(message.payload.clientId);
                break;

              case 'selectionMode':
                onSelectionModeChangeRef.current?.(
                  (message as SelectionModeMessage).payload.enabled,
                  (message as SelectionModeMessage).payload.message
                );
                break;

              case 'pong':
                // Keepalive acknowledged
                break;

              default:
                break;
            }
          } catch (error) {
            console.error('[component-picker] Error handling message:', error);
          }
        };

        wsRef.current = ws;
      } catch {
        // Retry connection with backoff if not cleaning up
        if (!isCleaningUpRef.current) {
          const delay = reconnectDelayRef.current;
          reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      }
    };

    // Delay initial connection to handle React Strict Mode
    // In Strict Mode, effects run twice quickly - the delay allows cleanup to run before connection starts
    connectTimeoutId = setTimeout(() => {
      connectTimeoutId = null;
      if (!isCleaningUpRef.current) {
        connect();
      }
    }, 100);

    return () => {
      isCleaningUpRef.current = true;

      // Clear the initial connection timeout
      if (connectTimeoutId) {
        clearTimeout(connectTimeoutId);
        connectTimeoutId = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        // Only close if not already closed/closing
        if (wsRef.current.readyState === WebSocket.OPEN ||
            wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [port, flushPendingSelections]); // Only depend on port and flush callback

  return {
    connected,
    sendSelection,
    clientId,
  };
}
