import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface SelectionOverlayProps {
  enabled: boolean;
  onSelect: (element: HTMLElement) => void;
  onCancel: () => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  componentName: string;
}

/**
 * Overlay component that highlights elements on hover and captures clicks
 */
export function SelectionOverlay({
  enabled,
  onSelect,
  onCancel,
}: SelectionOverlayProps): React.ReactElement | null {
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);

  // Get display name from element (prefer React component name, then className + text)
  const getComponentName = useCallback((element: HTMLElement): string => {
    // Try to get React component name from fiber first
    const fiberKey = Object.keys(element).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );

    let reactName: string | null = null;
    if (fiberKey) {
      const fiber = (element as unknown as Record<string, unknown>)[fiberKey] as {
        type?: { displayName?: string; name?: string } | string;
        return?: { type?: { displayName?: string; name?: string } };
      };

      // Check current fiber
      if (fiber?.type && typeof fiber.type === 'function') {
        const fn = fiber.type as { displayName?: string; name?: string };
        reactName = fn.displayName || fn.name || null;
      }

      // Walk up to find nearest named component
      if (!reactName || reactName === 'div' || reactName === 'button') {
        let current = fiber;
        while (current?.return) {
          current = current.return as typeof fiber;
          if (current?.type && typeof current.type === 'function') {
            const fn = current.type as { displayName?: string; name?: string };
            const name = fn.displayName || fn.name;
            if (name && !['Fragment', 'Suspense', 'Provider', 'Consumer'].includes(name)) {
              reactName = name;
              break;
            }
          }
        }
      }
    }

    // Get text content for context (truncated)
    const textContent = element.textContent?.trim().slice(0, 20) || '';
    const textSuffix = textContent ? ` "${textContent}${element.textContent && element.textContent.length > 20 ? '...' : ''}"` : '';

    // If we found a React component name, use it
    if (reactName && !['div', 'button', 'span', 'p', 'h1', 'h2', 'h3'].includes(reactName.toLowerCase())) {
      return `<${reactName}>${textSuffix}`;
    }

    // Fall back to className with text
    if (element.className && typeof element.className === 'string' && element.className.trim()) {
      const classes = element.className.trim().split(/\s+/)[0]; // Just first class
      return `.${classes}${textSuffix}`;
    }

    // Last resort: tag name with text
    return `<${element.tagName.toLowerCase()}>${textSuffix}`;
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;

      // Skip our own overlay elements
      if (target.closest('[data-component-picker]')) {
        setHighlight(null);
        hoveredElementRef.current = null;
        return;
      }

      // Skip html, body, and script elements
      if (['HTML', 'BODY', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(target.tagName)) {
        setHighlight(null);
        hoveredElementRef.current = null;
        return;
      }

      const rect = target.getBoundingClientRect();
      hoveredElementRef.current = target;

      setHighlight({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        componentName: getComponentName(target),
      });
    },
    [enabled, getComponentName]
  );

  // Handle click
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;

      // Skip our own overlay elements
      if (target.closest('[data-component-picker]')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (hoveredElementRef.current) {
        onSelect(hoveredElementRef.current);
      }
    },
    [enabled, onSelect]
  );

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [enabled, onCancel]
  );

  // Add event listeners
  useEffect(() => {
    if (!enabled) {
      setHighlight(null);
      hoveredElementRef.current = null;
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Change cursor
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.cursor = '';
    };
  }, [enabled, handleMouseMove, handleClick, handleKeyDown]);

  if (!enabled) return null;

  return (
    <>
      {/* Highlight box */}
      {highlight && (
        <div
          data-component-picker="highlight"
          style={{
            position: 'fixed',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
            zIndex: 999998,
            boxSizing: 'border-box',
          }}
        >
          {/* Component name label */}
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: -2,
              padding: '2px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '12px',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 500,
              borderRadius: '4px 4px 0 0',
              whiteSpace: 'nowrap',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlight.componentName}
          </div>
        </div>
      )}

    </>
  );
}
