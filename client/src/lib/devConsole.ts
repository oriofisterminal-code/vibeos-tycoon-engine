/**
 * Dev Console System
 * 
 * In-game console for debugging, monitoring, and log viewing
 * Captures all logs and provides real-time filtering/searching
 */

export type ConsoleLogLevel = "debug" | "info" | "warn" | "error";

export interface ConsoleLogEntry {
  id: number;
  timestamp: number;
  level: ConsoleLogLevel;
  message: string;
  data?: any;
  source?: string; // "logger", "game", "event", etc.
}

export interface ConsoleState {
  isOpen: boolean;
  logs: ConsoleLogEntry[];
  filter: ConsoleLogLevel | "all";
  searchQuery: string;
  autoScroll: boolean;
}

class DevConsole {
  private state: ConsoleState = {
    isOpen: false,
    logs: [],
    filter: "all",
    searchQuery: "",
    autoScroll: true
  };

  private maxLogs = 500;
  private logIdCounter = 0;
  private listeners: Array<(state: ConsoleState) => void> = [];

  /**
   * Add a log entry
   */
  addLog(
    level: ConsoleLogLevel,
    message: string,
    data?: any,
    source: string = "game"
  ): void {
    const entry: ConsoleLogEntry = {
      id: ++this.logIdCounter,
      timestamp: Date.now(),
      level,
      message,
      data,
      source
    };

    this.state.logs.push(entry);

    // Keep only recent logs
    if (this.state.logs.length > this.maxLogs) {
      this.state.logs.shift();
    }

    this.notifyListeners();
  }

  /**
   * Get filtered logs based on current filter and search
   */
  getFilteredLogs(): ConsoleLogEntry[] {
    return this.state.logs.filter(log => {
      // Filter by level
      if (this.state.filter !== "all" && log.level !== this.state.filter) {
        return false;
      }

      // Filter by search query
      if (this.state.searchQuery) {
        const query = this.state.searchQuery.toLowerCase();
        const messageMatch = log.message.toLowerCase().includes(query);
        const sourceMatch = log.source?.toLowerCase().includes(query);
        const dataMatch = JSON.stringify(log.data || "").toLowerCase().includes(query);

        if (!messageMatch && !sourceMatch && !dataMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Toggle console visibility
   */
  toggle(): void {
    this.state.isOpen = !this.state.isOpen;
    this.notifyListeners();
  }

  /**
   * Open console
   */
  open(): void {
    this.state.isOpen = true;
    this.notifyListeners();
  }

  /**
   * Close console
   */
  close(): void {
    this.state.isOpen = false;
    this.notifyListeners();
  }

  /**
   * Set filter level
   */
  setFilter(level: ConsoleLogLevel | "all"): void {
    this.state.filter = level;
    this.notifyListeners();
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notifyListeners();
  }

  /**
   * Toggle auto-scroll
   */
  toggleAutoScroll(): void {
    this.state.autoScroll = !this.state.autoScroll;
    this.notifyListeners();
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.state.logs = [];
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): ConsoleState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ConsoleState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](this.getState());
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.state.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCSV(): string {
    const headers = ["ID", "Timestamp", "Level", "Source", "Message", "Data"];
    const rows = this.state.logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.level,
      log.source || "game",
      log.message,
      JSON.stringify(log.data || "")
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    return csv;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<ConsoleLogLevel, number>;
    bySource: Record<string, number>;
  } {
    const stats = {
      totalLogs: this.state.logs.length,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      bySource: {} as Record<string, number>
    };

    for (const log of this.state.logs) {
      stats.byLevel[log.level]++;
      const source = log.source || "game";
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    }

    return stats;
  }
}

// Singleton instance
export const devConsole = new DevConsole();

/**
 * Hook into native console methods to capture logs
 */
export function hookNativeConsole(): void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  console.log = (...args: any[]) => {
    originalLog(...args);
    const message = args.map(arg => 
      typeof arg === "string" ? arg : JSON.stringify(arg)
    ).join(" ");
    devConsole.addLog("info", message, undefined, "native");
  };

  console.warn = (...args: any[]) => {
    originalWarn(...args);
    const message = args.map(arg => 
      typeof arg === "string" ? arg : JSON.stringify(arg)
    ).join(" ");
    devConsole.addLog("warn", message, undefined, "native");
  };

  console.error = (...args: any[]) => {
    originalError(...args);
    const message = args.map(arg => 
      typeof arg === "string" ? arg : JSON.stringify(arg)
    ).join(" ");
    devConsole.addLog("error", message, undefined, "native");
  };

  console.debug = (...args: any[]) => {
    originalDebug(...args);
    const message = args.map(arg => 
      typeof arg === "string" ? arg : JSON.stringify(arg)
    ).join(" ");
    devConsole.addLog("debug", message, undefined, "native");
  };
}

/**
 * Connect logger to dev console
 */
export function connectLoggerToDevConsole(): void {
  // This will be called from logger.ts
  // Avoids circular dependency
}

export default devConsole;
