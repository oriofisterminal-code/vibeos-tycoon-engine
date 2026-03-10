/**
 * Mod Manager
 * 
 * Features:
 * - Load mods from /data/mods directory
 * - Validate mod manifests
 * - Merge mod data with base game data
 * - Handle mod dependencies and conflicts
 * - Priority-based mod loading
 */

import { ModDataSchema, GameDataSchema, validateData, type ModData, type GameData } from "@/lib/dataSchema";
import { jsonLoader } from "@/lib/jsonLoader";
import { devConsole } from "@/lib/devConsole";

interface ModInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  priority: number;
  dependencies: string[];
  conflicts: string[];
}

interface LoadedMod {
  info: ModInfo;
  data: ModData;
}

class ModManager {
  private mods = new Map<string, LoadedMod>();
  private modOrder: string[] = [];
  private baseGameData: GameData | null = null;

  /**
   * Load all mods from directory
   */
  async loadMods(modsDirectory: string = "/data/mods"): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Load mod list
      const listResult = await jsonLoader.loadJSON<string[]>(
        `${modsDirectory}/modlist.json`,
        GameDataSchema // Use any schema for array
      );

      if (!listResult.success) {
        devConsole.addLog("warn", "No modlist.json found, loading no mods", undefined, "modManager");
        return { success: true, errors: [] };
      }

      const modIds = listResult.data as unknown as string[];

      // Load each mod
      for (const modId of modIds) {
        const result = await this.loadMod(modId, modsDirectory);
        if (!result.success) {
          errors.push(result.error);
        }
      }

      // Validate dependencies and conflicts
      const validationErrors = this.validateModGraph();
      errors.push(...validationErrors);

      // Sort mods by priority
      this.sortModsByPriority();

      devConsole.addLog("info", `Loaded ${this.mods.size} mods`, { modIds: Array.from(this.mods.keys()) }, "modManager");

      return { success: errors.length === 0, errors };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      devConsole.addLog("error", `Failed to load mods: ${error}`, err, "modManager");
      return { success: false, errors: [error] };
    }
  }

  /**
   * Load single mod
   */
  private async loadMod(
    modId: string,
    modsDirectory: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const modPath = `${modsDirectory}/${modId}`;
      const manifestPath = `${modPath}/manifest.json`;

      // Load manifest
      const manifestResult = await jsonLoader.loadJSON(
        manifestPath,
        GameDataSchema // Placeholder
      );

      if (!manifestResult.success) {
        return { success: false, error: `Failed to load manifest for ${modId}` };
      }

      const manifest = manifestResult.data as unknown as any;

      // Load mod data
      const dataPath = `${modPath}/data.json`;
      const dataResult = await jsonLoader.loadJSON<ModData>(dataPath, ModDataSchema);

      if (!dataResult.success) {
        return { success: false, error: `Failed to load data for ${modId}` };
      }

      // Store mod
      this.mods.set(modId, {
        info: {
          id: manifest.id || modId,
          name: manifest.name,
          version: manifest.version,
          enabled: manifest.enabled !== false,
          priority: manifest.priority || 0,
          dependencies: manifest.dependencies || [],
          conflicts: manifest.conflicts || []
        },
        data: dataResult.data
      });

      devConsole.addLog("info", `Loaded mod: ${modId}`, { version: manifest.version }, "modManager");
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Error loading mod ${modId}: ${error}` };
    }
  }

  /**
   * Validate mod dependencies and conflicts
   */
  private validateModGraph(): string[] {
    const errors: string[] = [];
    const enabledMods = Array.from(this.mods.values()).filter(m => m.info.enabled);

    for (const mod of enabledMods) {
      // Check dependencies
      for (const dep of mod.info.dependencies) {
        const depMod = this.mods.get(dep);
        if (!depMod || !depMod.info.enabled) {
          errors.push(`Mod ${mod.info.id} requires ${dep} which is not loaded`);
        }
      }

      // Check conflicts
      for (const conflict of mod.info.conflicts) {
        const conflictMod = this.mods.get(conflict);
        if (conflictMod && conflictMod.info.enabled) {
          errors.push(`Mod ${mod.info.id} conflicts with ${conflict}`);
        }
      }
    }

    return errors;
  }

  /**
   * Sort mods by priority
   */
  private sortModsByPriority(): void {
    const enabledMods = Array.from(this.mods.values()).filter(m => m.info.enabled);
    this.modOrder = enabledMods
      .sort((a, b) => b.info.priority - a.info.priority)
      .map(m => m.info.id);

    devConsole.addLog("debug", "Mod load order", { order: this.modOrder }, "modManager");
  }

  /**
   * Merge mod data with base game data
   */
  mergeModData(baseData: GameData): GameData {
    this.baseGameData = baseData;
    let merged = { ...baseData };

    // Apply mods in priority order
    for (const modId of this.modOrder) {
      const mod = this.mods.get(modId);
      if (!mod || !mod.info.enabled) continue;

      merged = this.mergeMod(merged, mod.data);
    }

    devConsole.addLog("info", "Merged mod data into game data", { modCount: this.modOrder.length }, "modManager");
    return merged;
  }

  /**
   * Merge single mod into game data
   */
  private mergeMod(baseData: GameData, modData: ModData): GameData {
    return {
      ...baseData,
      sagas: [...(baseData.sagas || []), ...(modData.sagas || [])],
      chapters: [...(baseData.chapters || []), ...(modData.chapters || [])],
      choices: [...(baseData.choices || []), ...(modData.choices || [])],
      employees: [...(baseData.employees || []), ...(modData.employees || [])],
      config: modData.config ? { ...baseData.config, ...modData.config } : baseData.config
    };
  }

  /**
   * Get loaded mods
   */
  getLoadedMods(): ModInfo[] {
    return Array.from(this.mods.values()).map(m => m.info);
  }

  /**
   * Enable/disable mod
   */
  setModEnabled(modId: string, enabled: boolean): boolean {
    const mod = this.mods.get(modId);
    if (!mod) return false;

    mod.info.enabled = enabled;
    this.sortModsByPriority();
    devConsole.addLog("info", `Mod ${modId} ${enabled ? "enabled" : "disabled"}`, undefined, "modManager");
    return true;
  }

  /**
   * Get mod info
   */
  getModInfo(modId: string): ModInfo | null {
    return this.mods.get(modId)?.info || null;
  }

  /**
   * Clear all mods
   */
  clearMods(): void {
    this.mods.clear();
    this.modOrder = [];
    this.baseGameData = null;
    devConsole.addLog("debug", "Cleared all mods", undefined, "modManager");
  }
}

// Singleton instance
export const modManager = new ModManager();

export default modManager;
