import React, { useCallback, type ReactNode } from 'react';
import { useWebSocketClient } from './hooks/useWebSocketClient.js';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut.js';
import { useSelectionMode } from './hooks/useSelectionMode.js';
import { useFiberInspector } from './hooks/useFiberInspector.js';
import { SelectionOverlay } from './SelectionOverlay.js';
import { buildSelectionData } from './utils/componentMetadata.js';

export interface ComponentPickerProps {
  /** WebSocket server port (default: 3333) */
  port?: number;
  /** Children to wrap */
  children: ReactNode;
  /** Keyboard shortcut key (default: 'C' for Ctrl+Alt+C / Cmd+Option+C) */
  shortcutKey?: string;
  /** Called when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Called when a component is selected */
  onSelect?: (componentName: string, filePath: string | null) => void;
}

/**
 * Wrapper component that enables component selection in development mode.
 * In production, this is a no-op passthrough.
 */
export function ComponentPicker(props: ComponentPickerProps): ReactNode {
  // No-op in production
  if (process.env.NODE_ENV !== 'development') {
    return props.children;
  }

  return <ComponentPickerImpl {...props} />;
}

/**
 * Implementation component (only rendered in development)
 */
function ComponentPickerImpl({
  port = 3333,
  children,
  shortcutKey = 'C',
  onConnectionChange,
  onSelect,
}: ComponentPickerProps): React.ReactElement {
  const { isSelectionMode, selectionMessage, enableSelectionMode, disableSelectionMode } =
    useSelectionMode();

  const { getFiberFromElement, extractFiberData, findNearestComponentFiber } = useFiberInspector();

  const { connected, sendSelection } = useWebSocketClient({
    port,
    onSelectionModeChange: (enabled, message) => {
      if (enabled) {
        enableSelectionMode(message);
      } else {
        disableSelectionMode();
      }
    },
    onConnectionChange,
  });

  // Handle keyboard shortcut
  useKeyboardShortcut({
    key: shortcutKey,
    onTrigger: () => {
      if (isSelectionMode) {
        disableSelectionMode();
      } else {
        enableSelectionMode();
      }
    },
    enabled: connected,
  });

  // Handle element selection
  const handleSelect = useCallback(
    async (element: HTMLElement) => {
      try {
        // Get fiber from element
        const fiber = getFiberFromElement(element);
        if (!fiber) {
          console.warn('[component-picker] No React fiber found for element');
          disableSelectionMode();
          return;
        }

        // Find nearest component fiber
        const componentFiber = findNearestComponentFiber(fiber);
        if (!componentFiber) {
          console.warn('[component-picker] No component fiber found');
          disableSelectionMode();
          return;
        }

        // Extract fiber data
        const fiberData = extractFiberData(componentFiber);

        // Build complete selection data (pass fiber for enhanced source resolution)
        const selectionData = await buildSelectionData(element, fiberData, {
          fiber: componentFiber,
        });

        // Send to server
        sendSelection(selectionData);

        // Notify callback
        onSelect?.(selectionData.component.name, selectionData.source.filePath);

        console.log(
          `[component-picker] Selected: ${selectionData.component.name}`,
          selectionData.source.filePath
            ? `at ${selectionData.source.filePath}:${selectionData.source.lineNumber}`
            : ''
        );
      } catch (error) {
        console.error('[component-picker] Selection error:', error);
      } finally {
        disableSelectionMode();
      }
    },
    [
      getFiberFromElement,
      findNearestComponentFiber,
      extractFiberData,
      sendSelection,
      disableSelectionMode,
      onSelect,
    ]
  );

  return (
    <>
      {children}
      <SelectionOverlay
        enabled={isSelectionMode}
        message={selectionMessage}
        onSelect={handleSelect}
        onCancel={disableSelectionMode}
      />
      {/* Selection toggle button (bottom-right corner) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          data-component-picker="status"
          onClick={() => {
            if (!connected) return;
            if (isSelectionMode) {
              disableSelectionMode();
            } else {
              enableSelectionMode();
            }
          }}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            padding: '8px 12px',
            backgroundColor: !connected
              ? '#ef4444'
              : isSelectionMode
                ? '#f59e0b'
                : '#22c55e',
            color: 'white',
            borderRadius: '9999px',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 500,
            zIndex: 999997,
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            border: 'none',
            cursor: connected ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s ease',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'white',
              animation: !connected ? 'pulse 2s infinite' : 'none',
            }}
          />
          {!connected
            ? 'Connecting...'
            : isSelectionMode
              ? 'Click a Component'
              : 'Select Component'}
        </button>
      )}
    </>
  );
}
