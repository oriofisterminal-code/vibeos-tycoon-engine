/**
 * Logger Integration with DevConsole
 * 
 * Connects the logger system to the dev console for unified logging
 */

import { devConsole } from "@/lib/devConsole";

/**
 * Log to dev console
 */
export function logToConsole(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  data?: any,
  source: string = "game"
): void {
  devConsole.addLog(level, message, data, source);
}

/**
 * Wrap logger functions to also log to console
 */
export function createLoggerWithConsole() {
  return {
    debug: (message: string, data?: any) => {
      logToConsole("debug", message, data, "logger");
    },
    info: (message: string, data?: any) => {
      logToConsole("info", message, data, "logger");
    },
    warn: (message: string, data?: any) => {
      logToConsole("warn", message, data, "logger");
    },
    error: (message: string, data?: any) => {
      logToConsole("error", message, data, "logger");
    }
  };
}

export default {
  logToConsole,
  createLoggerWithConsole
};
