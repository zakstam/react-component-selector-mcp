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

  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  const sendSelection = useCallback((data: SelectionData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = createMessage('selection', data);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[component-picker] Cannot send selection - not connected');
    }
  }, []);

  useEffect(() => {
    // Reset cleanup flag on mount
    isCleaningUpRef.current = false;

    // Prevent running if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN || isCleaningUpRef.current) {
        return;
      }

      try {
        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.onopen = () => {
          if (isCleaningUpRef.current) {
            ws.close();
            return;
          }
          console.log('[component-picker] Connected to server');
          setConnected(true);
          onConnectionChangeRef.current?.(true);

          // Start ping interval
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(createMessage('ping')));
            }
          }, 25000);
        };

        ws.onclose = () => {
          console.log('[component-picker] Disconnected from server');
          setConnected(false);
          setClientId(null);
          onConnectionChangeRef.current?.(false);

          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          // Only attempt reconnection if not cleaning up
          if (!isCleaningUpRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, 3000);
          }
        };

        ws.onerror = () => {
          // Error is logged but we don't need to do anything special
          // onclose will be called after onerror
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
      } catch (error) {
        console.error('[component-picker] Failed to connect:', error);

        // Retry connection if not cleaning up
        if (!isCleaningUpRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      }
    };

    connect();

    return () => {
      isCleaningUpRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [port]); // Only depend on port

  return {
    connected,
    sendSelection,
    clientId,
  };
}
