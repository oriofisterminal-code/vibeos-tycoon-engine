/**
 * Data Manager Component
 * 
 * UI for managing game data:
 * - Load/reload data
 * - Manage mods
 * - View data statistics
 * - Hot-reload status
 */

import { useEffect, useState } from "react";
import { jsonLoader } from "@/lib/jsonLoader";
import { modManager } from "@/lib/modManager";
import { hotReloadManager } from "@/lib/hotReload";
import { devConsole } from "@/lib/devConsole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Settings, AlertCircle, CheckCircle } from "lucide-react";
import type { GameData } from "@/lib/dataSchema";

interface DataManagerProps {
  onDataLoaded?: (data: GameData) => void;
}

export function DataManager({ onDataLoaded }: DataManagerProps) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hotReloadEnabled, setHotReloadEnabled] = useState(hotReloadManager.isEnabled());
  const [cacheStats, setCacheStats] = useState({ size: 0, entries: 0 });

  // Load initial data
  useEffect(() => {
    loadGameData();
  }, []);

  // Subscribe to hot reload
  useEffect(() => {
    if (!hotReloadEnabled) return;

    const unsubscribe = hotReloadManager.subscribe((data) => {
      setGameData(data);
      onDataLoaded?.(data);
    });

    return unsubscribe;
  }, [hotReloadEnabled, onDataLoaded]);

  const loadGameData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load game data
      const result = await jsonLoader.loadGameData();
      if (!result.success) {
        setError(result.error);
        devConsole.addLog("error", "Failed to load game data", result.error, "dataManager");
        return;
      }

      // Load mods
      const modsResult = await modManager.loadMods();
      if (!modsResult.success && modsResult.errors.length > 0) {
        devConsole.addLog("warn", "Some mods failed to load", modsResult.errors, "dataManager");
      }

      // Merge mod data
      const mergedData = modManager.mergeModData(result.data);
      setGameData(mergedData);
      setMods(modManager.getLoadedMods());

      // Update cache stats
      const stats = jsonLoader.getCacheStats();
      setCacheStats({ size: stats.size, entries: stats.entries.length });

      onDataLoaded?.(mergedData);

      devConsole.addLog("info", "Game data loaded successfully", {
        sagas: mergedData.sagas?.length || 0,
        chapters: mergedData.chapters?.length || 0,
        mods: mods.length
      }, "dataManager");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      devConsole.addLog("error", "Error loading game data", err, "dataManager");
    } finally {
      setLoading(false);
    }
  };

  const toggleHotReload = () => {
    if (hotReloadEnabled) {
      hotReloadManager.stop();
      setHotReloadEnabled(false);
      devConsole.addLog("info", "Hot reload disabled", undefined, "dataManager");
    } else {
      if (gameData) {
        hotReloadManager.start(gameData);
        setHotReloadEnabled(true);
        devConsole.addLog("info", "Hot reload enabled", undefined, "dataManager");
      }
    }
  };

  const clearCache = () => {
    jsonLoader.clearCache();
    setCacheStats({ size: 0, entries: 0 });
    devConsole.addLog("info", "Cache cleared", undefined, "dataManager");
  };

  const toggleMod = (modId: string) => {
    const mod = mods.find(m => m.id === modId);
    if (mod) {
      modManager.setModEnabled(modId, !mod.enabled);
      setMods([...modManager.getLoadedMods()]);
      devConsole.addLog("info", `Mod ${modId} toggled`, { enabled: !mod.enabled }, "dataManager");
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Data Manager</h2>
        <Button
          onClick={loadGameData}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Status Cards */}
      {gameData && (
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <p className="text-xs text-gray-600">Sagas</p>
            <p className="text-2xl font-bold">{gameData.sagas?.length || 0}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-gray-600">Chapters</p>
            <p className="text-2xl font-bold">{gameData.chapters?.length || 0}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-gray-600">Choices</p>
            <p className="text-2xl font-bold">{gameData.choices?.length || 0}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-gray-600">Mods</p>
            <p className="text-2xl font-bold">{mods.length}</p>
          </Card>
        </div>
      )}

      {/* Cache Stats */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <p className="text-xs font-semibold text-blue-900">Cache</p>
        <p className="text-sm text-blue-800">{cacheStats.size} entries cached</p>
        <Button
          onClick={clearCache}
          size="sm"
          variant="ghost"
          className="mt-2 text-xs"
        >
          Clear Cache
        </Button>
      </Card>

      {/* Hot Reload Toggle */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hotReloadEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm font-semibold">
              Hot Reload: {hotReloadEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <Button
            onClick={toggleHotReload}
            size="sm"
            variant={hotReloadEnabled ? "default" : "outline"}
          >
            {hotReloadEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </Card>

      {/* Mods List */}
      {mods.length > 0 && (
        <Card className="p-3">
          <p className="text-sm font-semibold mb-2">Loaded Mods</p>
          <div className="space-y-2">
            {mods.map(mod => (
              <div key={mod.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium">{mod.name}</p>
                  <p className="text-xs text-gray-600">{mod.id}</p>
                </div>
                <Button
                  onClick={() => toggleMod(mod.id)}
                  size="sm"
                  variant={mod.enabled ? "default" : "outline"}
                >
                  {mod.enabled ? "On" : "Off"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Settings */}
      <Card className="p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-600">
            Version: {gameData?.version || "unknown"}
          </p>
        </div>
      </Card>
    </div>
  );
}

export default DataManager;
