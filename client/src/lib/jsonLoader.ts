/**
 * Dynamic JSON Loader
 * 
 * Features:
 * - Async JSON loading from multiple sources
 * - Comprehensive validation with Zod
 * - Caching for performance
 * - Error recovery and fallbacks
 * - Development mode hot-reload support
 */

import { GameDataSchema, validateData, type GameData } from "@/lib/dataSchema";
import { devConsole } from "@/lib/devConsole";

interface LoaderConfig {
  baseUrl?: string;
  cache?: boolean;
  timeout?: number;
  debugMode?: boolean;
  maxCacheSize?: number; // Max entries in cache
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

class JSONLoader {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: Required<LoaderConfig & { maxCacheSize: number }>;
  private loadingPromises = new Map<string, Promise<unknown>>();

  constructor(config: LoaderConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? "/data",
      cache: config.cache ?? true,
      timeout: config.timeout ?? 10000,
      debugMode: config.debugMode ?? false,
      maxCacheSize: config.maxCacheSize ?? 100
    };
  }

  /**
   * Load JSON file with validation
   */
  async loadJSON<T>(
    path: string,
    schema: unknown,
    options?: { cache?: boolean; timeout?: number }
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    const cacheKey = path;
    const useCache = options?.cache ?? this.config.cache;
    const timeout = options?.timeout ?? this.config.timeout;

    // Return cached data if available
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      devConsole.addLog("debug", `Loaded from cache: ${path}`, undefined, "jsonLoader");
      return { success: true, data: cached.data as T };
    }

    // Prevent duplicate requests
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)! as Promise<{ success: true; data: T } | { success: false; error: string }>;
    }

    // Create loading promise
    const loadPromise = this.fetchAndValidate<T>(path, schema, timeout);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;

      // Cache successful result
      if (result.success && useCache) {
        this.cache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
        this.manageCacheSize();
      }

      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load game data (sagas, chapters, choices, etc.)
   */
  async loadGameData(
    filename: string = "gamedata.json",
    options?: { cache?: boolean }
  ): Promise<{ success: true; data: GameData } | { success: false; error: string }> {
    return this.loadJSON<GameData>(
      `${this.config.baseUrl}/${filename}`,
      GameDataSchema,
      options
    );
  }

  /**
   * Load multiple JSON files in parallel
   */
  async loadMultiple<T>(
    paths: string[],
    schema: any,
    options?: { cache?: boolean }
  ): Promise<{ success: true; data: T[] } | { success: false; errors: Map<string, string> }> {
    const results = await Promise.all(
      paths.map(path => this.loadJSON<T>(path, schema, options))
    );

    const errors = new Map<string, string>();
    const data: T[] = [];

    results.forEach((result, index) => {
      if (result.success) {
        data.push(result.data);
      } else {
        errors.set(paths[index], result.error);
      }
    });

    if (errors.size > 0) {
      return { success: false, errors };
    }

    return { success: true, data };
  }

  /**
   * Clear cache with size management
   */
  clearCache(path?: string): void {
    if (path) {
      this.cache.delete(path);
      devConsole.addLog("debug", `Cleared cache for: ${path}`, undefined, "jsonLoader");
    } else {
      this.cache.clear();
      devConsole.addLog("debug", "Cleared all cache", undefined, "jsonLoader");
    }
  }

  /**
   * Manage cache size to prevent memory bloat
   */
  private manageCacheSize(): void {
    if (this.cache.size > this.config.maxCacheSize) {
      // Remove oldest entries (FIFO)
      const entriesToRemove = this.cache.size - this.config.maxCacheSize;
      let removed = 0;
      const keys = Array.from(this.cache.keys());
      
      for (const key of keys) {
        if (removed >= entriesToRemove) break;
        this.cache.delete(key);
        removed++;
      }
      
      devConsole.addLog("debug", `Cache size exceeded, removed ${removed} entries`, undefined, "jsonLoader");
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Fetch and validate JSON
   */
  private async fetchAndValidate<T>(
    path: string,
    schema: unknown,
    timeout: number
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(path, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json"
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = `Failed to load ${path}: ${response.status} ${response.statusText}`;
        devConsole.addLog("error", error, undefined, "jsonLoader");
        return { success: false, error };
      }

      const json = await response.json();

      // Validate with schema
      const validation = validateData(schema as any, json);
      if (!validation.valid) {
        const error = `Validation failed for ${path}: ${validation.errors.join(", ")}`;
        devConsole.addLog("error", error, validation.errors, "jsonLoader");
        return { success: false, error };
      }

      devConsole.addLog("info", `Loaded: ${path}`, undefined, "jsonLoader");
      return { success: true, data: validation.data as unknown as T };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      devConsole.addLog("error", `Error loading ${path}: ${error}`, err, "jsonLoader");
      return { success: false, error };
    }
  }
}

// Singleton instance
export const jsonLoader = new JSONLoader({
  baseUrl: "/data",
  cache: true,
  debugMode: process.env.NODE_ENV === "development"
});

export default jsonLoader;
