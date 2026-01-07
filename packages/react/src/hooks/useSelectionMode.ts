import { useState, useCallback } from 'react';

export interface UseSelectionModeReturn {
  isSelectionMode: boolean;
  selectionMessage: string | undefined;
  enableSelectionMode: (message?: string) => void;
  disableSelectionMode: () => void;
  toggleSelectionMode: () => void;
}

/**
 * Hook to manage selection mode state
 */
export function useSelectionMode(): UseSelectionModeReturn {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState<string | undefined>();

  const enableSelectionMode = useCallback((message?: string) => {
    setIsSelectionMode(true);
    setSelectionMessage(message);
  }, []);

  const disableSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectionMessage(undefined);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectionMessage(undefined);
    }
  }, [isSelectionMode]);

  return {
    isSelectionMode,
    selectionMessage,
    enableSelectionMode,
    disableSelectionMode,
    toggleSelectionMode,
  };
}
