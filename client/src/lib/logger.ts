/**
 * Logger System
 * 
 * Centralized logging for debugging and monitoring
 * Supports different log levels and can be toggled via environment
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDev = process.env.NODE_ENV === "development";
  private enableDebug = process.env.DEBUG === "true" || this.isDev;

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: any): void {
    if (!this.enableDebug) return;
    this.log("debug", message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log("warn", message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log("error", message, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const entry: LogEntry = { timestamp, level, message, data };

    // Add to internal log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${level.toUpperCase()}]`;
    const style = this.getConsoleStyle(level);

    if (data !== undefined) {
      console.log(`%c${prefix} ${message}`, style, data);
    } else {
      console.log(`%c${prefix} ${message}`, style);
    }
  }

  /**
   * Get console style for log level
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: "color: #888; font-weight: normal;",
      info: "color: #0066cc; font-weight: bold;",
      warn: "color: #ff9900; font-weight: bold;",
      error: "color: #cc0000; font-weight: bold;"
    };
    return styles[level];
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Toggle debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.enableDebug = enabled;
    this.info(`Debug mode ${enabled ? "enabled" : "disabled"}`);
  }
}

// Singleton instance
export const logger = new Logger();

// ============================================================================
// SPECIALIZED LOGGERS
// ============================================================================

/**
 * Log game state changes
 */
export function logGameStateChange(action: string, before: any, after: any): void {
  logger.debug(`Game state changed: ${action}`, {
    before,
    after,
    changed: before !== after
  });
}

/**
 * Log saga progress
 */
export function logSagaProgress(sagaId: number, sagaName: string, action: string, data?: any): void {
  logger.info(`Saga #${sagaId} (${sagaName}): ${action}`, data);
}

/**
 * Log employee action
 */
export function logEmployeeAction(employeeId: number, employeeName: string, action: string, data?: any): void {
  logger.info(`Employee #${employeeId} (${employeeName}): ${action}`, data);
}

/**
 * Log economy event
 */
export function logEconomyEvent(action: string, amount: number, reason: string): void {
  logger.info(`Economy: ${action} $${amount.toLocaleString()} (${reason})`);
}

/**
 * Log AP allocation
 */
export function logAPAllocation(allocations: { sagaId: number; percentage: number }[]): void {
  const summary = allocations.map(a => `Saga ${a.sagaId}: ${a.percentage}%`).join(", ");
  logger.info(`AP allocated: ${summary}`);
}

/**
 * Log error with context
 */
export function logErrorWithContext(error: Error, context: string, data?: any): void {
  logger.error(`${context}: ${error.message}`, {
    error: error.toString(),
    stack: error.stack,
    context,
    data
  });
}

/**
 * Log performance metric
 */
export function logPerformanceMetric(name: string, duration: number, threshold?: number): void {
  const status = threshold && duration > threshold ? "⚠️ SLOW" : "✓ OK";
  logger.debug(`Performance [${status}]: ${name} took ${duration}ms`, {
    name,
    duration,
    threshold,
    slow: threshold ? duration > threshold : false
  });
}

export default logger;
