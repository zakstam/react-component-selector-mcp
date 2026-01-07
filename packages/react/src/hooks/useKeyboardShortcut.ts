import { useEffect, useCallback } from 'react';

export interface UseKeyboardShortcutOptions {
  /** Key to press with modifiers (default: 'C') */
  key?: string;
  /** Callback when shortcut is triggered */
  onTrigger: () => void;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

/**
 * Hook to handle Ctrl+Alt+C (Windows/Linux) / Cmd+Option+C (Mac) keyboard shortcut
 */
export function useKeyboardShortcut(options: UseKeyboardShortcutOptions): void {
  const { key = 'C', onTrigger, enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check for Ctrl+Alt+C (Windows/Linux) or Cmd+Option+C (Mac)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.altKey && event.key.toUpperCase() === key.toUpperCase()) {
        event.preventDefault();
        event.stopPropagation();
        onTrigger();
      }
    },
    [key, onTrigger, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown, enabled]);
}
