import { useCallback } from 'react';
import type { ComponentInfo, ComponentType } from '@react-component-selector-mcp/shared';

// React Fiber types (internal)
interface Fiber {
  tag: number;
  type: unknown;
  stateNode: unknown;
  return: Fiber | null;
  memoizedProps: Record<string, unknown>;
  memoizedState: unknown;
  _debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber?: number;
  };
}

// React DevTools global hook
interface ReactDevToolsHook {
  renderers?: Map<number, {
    findFiberByHostInstance?: (element: Element) => Fiber | null;
  }>;
}

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  }
}

// React Fiber tags
const FIBER_TAGS = {
  FunctionComponent: 0,
  ClassComponent: 1,
  ForwardRef: 11,
  MemoComponent: 14,
  SimpleMemoComponent: 15,
} as const;

export interface FiberData {
  componentInfo: ComponentInfo;
  props: Record<string, unknown>;
  state: Record<string, unknown> | null;
  parentComponents: string[];
  debugSource: {
    fileName: string | null;
    lineNumber: number | null;
    columnNumber: number | null;
  };
}

export interface UseFiberInspectorReturn {
  getFiberFromElement: (element: HTMLElement) => Fiber | null;
  extractFiberData: (fiber: Fiber) => FiberData;
  findNearestComponentFiber: (fiber: Fiber) => Fiber | null;
}

/**
 * Hook for inspecting React Fiber internals
 */
export function useFiberInspector(): UseFiberInspectorReturn {
  /**
   * Get React Fiber from DOM element
   */
  const getFiberFromElement = useCallback((element: HTMLElement): Fiber | null => {
    // Try DevTools hook first (most reliable)
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers) {
      for (const renderer of window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.values()) {
        const fiber = renderer.findFiberByHostInstance?.(element);
        if (fiber) return fiber;
      }
    }

    // Fallback to internal keys
    const fiberKey = Object.keys(element).find(
      (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
    );

    if (fiberKey) {
      const fiber = (element as unknown as Record<string, Fiber | undefined>)[fiberKey];
      return fiber ?? null;
    }

    return null;
  }, []);

  /**
   * Get component type from fiber tag
   */
  const getComponentType = useCallback((fiber: Fiber): ComponentType => {
    switch (fiber.tag) {
      case FIBER_TAGS.ClassComponent:
        return 'class';
      case FIBER_TAGS.ForwardRef:
        return 'forwardRef';
      case FIBER_TAGS.MemoComponent:
      case FIBER_TAGS.SimpleMemoComponent:
        return 'memo';
      case FIBER_TAGS.FunctionComponent:
      default:
        return 'function';
    }
  }, []);

  /**
   * Get component name from fiber
   */
  const getComponentName = useCallback((fiber: Fiber): string => {
    const type = fiber.type;

    if (!type) return 'Unknown';

    // Function or class component
    if (typeof type === 'function') {
      const fn = type as { displayName?: string; name?: string };
      return fn.displayName || fn.name || 'Anonymous';
    }

    // ForwardRef
    if (typeof type === 'object' && type !== null) {
      const obj = type as { displayName?: string; render?: { displayName?: string; name?: string }; type?: { displayName?: string; name?: string } };

      if (obj.displayName) return obj.displayName;
      if (obj.render) return obj.render.displayName || obj.render.name || 'ForwardRef';
      if (obj.type) return obj.type.displayName || obj.type.name || 'Memo';
    }

    return 'Unknown';
  }, []);

  /**
   * Find the nearest user-defined component fiber (skip host/native elements)
   */
  const findNearestComponentFiber = useCallback((fiber: Fiber): Fiber | null => {
    let current: Fiber | null = fiber;

    while (current) {
      // Check if it's a user component (function, class, forwardRef, memo)
      const tag = current.tag;
      if (
        tag === FIBER_TAGS.FunctionComponent ||
        tag === FIBER_TAGS.ClassComponent ||
        tag === FIBER_TAGS.ForwardRef ||
        tag === FIBER_TAGS.MemoComponent ||
        tag === FIBER_TAGS.SimpleMemoComponent
      ) {
        const name = getComponentName(current);
        // Skip internal React components
        if (!name.startsWith('_') && name !== 'Unknown' && name !== 'Anonymous') {
          return current;
        }
      }

      current = current.return;
    }

    return null;
  }, [getComponentName]);

  /**
   * Get parent component names from fiber tree
   */
  const getParentComponents = useCallback(
    (fiber: Fiber): string[] => {
      const parents: string[] = [];
      let current = fiber.return;

      while (current && parents.length < 10) {
        const tag = current.tag;
        if (
          tag === FIBER_TAGS.FunctionComponent ||
          tag === FIBER_TAGS.ClassComponent ||
          tag === FIBER_TAGS.ForwardRef ||
          tag === FIBER_TAGS.MemoComponent ||
          tag === FIBER_TAGS.SimpleMemoComponent
        ) {
          const name = getComponentName(current);
          if (!name.startsWith('_') && name !== 'Unknown') {
            parents.push(name);
          }
        }
        current = current.return;
      }

      return parents;
    },
    [getComponentName]
  );

  /**
   * Safely serialize props (handle circular refs, functions, etc.)
   */
  const serializeProps = useCallback((props: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      // Skip React internal props
      if (key === 'children' || key === 'key' || key === 'ref') continue;

      try {
        if (typeof value === 'function') {
          result[key] = '[Function]';
        } else if (value instanceof Element) {
          result[key] = '[Element]';
        } else if (typeof value === 'object' && value !== null) {
          // Attempt JSON serialization to check for circular refs
          JSON.stringify(value);
          result[key] = value;
        } else {
          result[key] = value;
        }
      } catch {
        result[key] = '[Circular or Unserializable]';
      }
    }

    return result;
  }, []);

  /**
   * Extract state from class component
   */
  const extractState = useCallback((fiber: Fiber): Record<string, unknown> | null => {
    if (fiber.tag !== FIBER_TAGS.ClassComponent) {
      return null;
    }

    const instance = fiber.stateNode as { state?: Record<string, unknown> } | null;
    if (instance?.state) {
      try {
        JSON.stringify(instance.state);
        return instance.state;
      } catch {
        return { error: '[Unserializable state]' };
      }
    }

    return null;
  }, []);

  /**
   * Extract all relevant data from a fiber
   */
  const extractFiberData = useCallback(
    (fiber: Fiber): FiberData => {
      return {
        componentInfo: {
          name: getComponentName(fiber),
          type: getComponentType(fiber),
        },
        props: serializeProps(fiber.memoizedProps || {}),
        state: extractState(fiber),
        parentComponents: getParentComponents(fiber),
        debugSource: {
          fileName: fiber._debugSource?.fileName ?? null,
          lineNumber: fiber._debugSource?.lineNumber ?? null,
          columnNumber: fiber._debugSource?.columnNumber ?? null,
        },
      };
    },
    [getComponentName, getComponentType, serializeProps, extractState, getParentComponents]
  );

  return {
    getFiberFromElement,
    extractFiberData,
    findNearestComponentFiber,
  };
}
