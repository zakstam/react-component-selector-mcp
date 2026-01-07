import type { SelectionData } from '../types.js';

export interface StorageOptions {
  maxHistory?: number;
}

/**
 * In-memory storage for component selections
 * Maintains history and provides access to latest selection
 */
export class SelectionStorage {
  private selections: SelectionData[] = [];
  private maxHistory: number;
  private selectionWaiters: Array<{
    resolve: (data: SelectionData) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(options: StorageOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  /**
   * Add a new selection to storage
   */
  addSelection(data: SelectionData): void {
    this.selections.unshift(data);

    // Trim history if needed
    if (this.selections.length > this.maxHistory) {
      this.selections = this.selections.slice(0, this.maxHistory);
    }

    // Resolve any waiters
    for (const waiter of this.selectionWaiters) {
      clearTimeout(waiter.timeoutId);
      waiter.resolve(data);
    }
    this.selectionWaiters = [];
  }

  /**
   * Get the most recent selection
   */
  getLatest(): SelectionData | null {
    return this.selections[0] ?? null;
  }

  /**
   * Get selection history
   */
  getHistory(limit: number = 10, includeScreenshots: boolean = false): SelectionData[] {
    const results = this.selections.slice(0, limit);

    if (!includeScreenshots) {
      return results.map((selection) => ({
        ...selection,
        screenshot: {
          ...selection.screenshot,
          dataUrl: '[omitted]',
        },
      }));
    }

    return results;
  }

  /**
   * Wait for the next selection with timeout
   */
  waitForSelection(timeout: number = 60000): Promise<SelectionData> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.selectionWaiters.findIndex(
          (w) => w.resolve === resolve
        );
        if (index !== -1) {
          this.selectionWaiters.splice(index, 1);
        }
        reject(new Error('Selection timeout'));
      }, timeout);

      this.selectionWaiters.push({ resolve, reject, timeoutId });
    });
  }

  /**
   * Clear all stored selections
   */
  clear(): void {
    this.selections = [];
  }

  /**
   * Get count of stored selections
   */
  getCount(): number {
    return this.selections.length;
  }
}
