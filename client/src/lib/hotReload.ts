/**
 * Hot Reload System
 * 
 * Features:
 * - Watch for file changes in /data directory
 * - Reload and merge data without restart
 * - Notify subscribers of updates
 * - Development mode only
 */

import { jsonLoader } from "@/lib/jsonLoader";
import { modManager } from "@/lib/modManager";
import { devConsole } from "@/lib/devConsole";
import type { GameData } from "@/lib/dataSchema";

type HotReloadListener = (data: GameData) => void;

interface HotReloadConfig {
  enabled: boolean;
  pollInterval?: number;
  watchPaths?: string[];
}

class HotReloadManager {
  private listeners: HotReloadListener[] = [];
  private config: Required<HotReloadConfig>;
  private watchedFiles = new Map<string, number>(); // path -> lastModified
  private pollInterval: NodeJS.Timeout | null = null;
  private currentData: GameData | null = null;
  private reloadInProgress = false; // Prevent concurrent reloads
  private lastReloadTime = 0; // Debounce reloads

  constructor(config: HotReloadConfig = { enabled: false }) {
    this.config = {
      enabled: config.enabled && process.env.NODE_ENV === "development",
      pollInterval: config.pollInterval ?? 2000,
      watchPaths: config.watchPaths ?? ["/data/gamedata.json", "/data/mods"]
    };
  }

  /**
   * Start watching for changes
   */
  start(initialData: GameData): void {
    if (!this.config.enabled) {
      devConsole.addLog("debug", "Hot reload disabled", undefined, "hotReload");
      return;
    }

    this.currentData = initialData;
    this.initializeWatchedFiles();
    this.startPolling();

    devConsole.addLog("info", "Hot reload started", { interval: this.config.pollInterval }, "hotReload");
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.watchedFiles.clear();
    devConsole.addLog("debug", "Hot reload stopped", undefined, "hotReload");
  }

  /**
   * Subscribe to reload events
   */
  subscribe(listener: HotReloadListener): () => void {
    this.listeners.push(listener);

    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  /**
   * Initialize watched files
   */
  private initializeWatchedFiles(): void {
    for (const path of this.config.watchPaths) {
      this.watchedFiles.set(path, 0);
    }
  }

  /**
   * Start polling for changes
   */
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.checkForChanges();
    }, this.config.pollInterval);
  }

  /**
   * Check for file changes with debouncing
   */
  private async checkForChanges(): Promise<void> {
    // Prevent concurrent reloads
    if (this.reloadInProgress) return;
    
    // Debounce: don't reload more than once per second
    const now = Date.now();
    if (now - this.lastReloadTime < 1000) return;

    try {
      let hasChanges = false;
      
      for (const path of this.config.watchPaths) {
        const response = await fetch(path, { method: "HEAD" });

        if (!response.ok) continue;

        const lastModified = response.headers.get("Last-Modified");
        if (!lastModified) continue;

        const newTime = new Date(lastModified).getTime();
        const oldTime = this.watchedFiles.get(path) || 0;

        if (newTime > oldTime) {
          this.watchedFiles.set(path, newTime);
          hasChanges = true;
          break; // Reload once for any change
        }
      }
      
      if (hasChanges) {
        this.lastReloadTime = now;
        await this.reloadData("");
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      devConsole.addLog("debug", `Hot reload check error: ${error}`, undefined, "hotReload");
    }
  }

  /**
   * Reload data from file with concurrency control
   */
  private async reloadData(path: string): Promise<void> {
    if (this.reloadInProgress) return;
    this.reloadInProgress = true;
    
    try {
      // Clear cache for this file
      jsonLoader.clearCache(path);

      // Reload mods if watching mod directory
      if (path.includes("mods")) {
        const modsResult = await modManager.loadMods("/data/mods");
        if (!modsResult.success) {
          devConsole.addLog("warn", "Failed to reload mods", { errors: modsResult.errors }, "hotReload");
          return;
        }
      }

      // Reload game data
      const dataResult = await jsonLoader.loadGameData();
      if (!dataResult.success) {
        devConsole.addLog("warn", "Failed to reload game data", { error: dataResult.error }, "hotReload");
        return;
      }

      // Merge with mods
      const mergedData = modManager.mergeModData(dataResult.data);
      this.currentData = mergedData;

      // Notify listeners
      this.notifyListeners(mergedData);

      devConsole.addLog("info", "Hot reload applied", { path }, "hotReload");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      devConsole.addLog("error", `Hot reload error: ${error}`, err, "hotReload");
    } finally {
      this.reloadInProgress = false;
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(data: GameData): void {
    for (let i = 0; i < this.listeners.length; i++) {
      try {
        this.listeners[i](data);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        devConsole.addLog("error", `Hot reload listener error: ${error}`, err, "hotReload");
      }
    }
  }

  /**
   * Get current data
   */
  getCurrentData(): GameData | null {
    return this.currentData;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Singleton instance
export const hotReloadManager = new HotReloadManager({
  enabled: process.env.NODE_ENV === "development",
  pollInterval: 2000,
  watchPaths: ["/data/gamedata.json", "/data/mods"]
});

export default hotReloadManager;
