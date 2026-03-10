/**
 * Dev Console Component
 * 
 * In-game console UI for debugging and monitoring
 * Displays logs, allows filtering, searching, and exporting
 */

import { useEffect, useRef, useState } from "react";
import { devConsole, type ConsoleState, type ConsoleLogLevel } from "@/lib/devConsole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Download, Trash2, Copy } from "lucide-react";

const LOG_LEVEL_COLORS: Record<ConsoleLogLevel, string> = {
  debug: "text-gray-500",
  info: "text-blue-500",
  warn: "text-yellow-500",
  error: "text-red-500"
};

const LOG_LEVEL_BG: Record<ConsoleLogLevel, string> = {
  debug: "bg-gray-900",
  info: "bg-blue-900",
  warn: "bg-yellow-900",
  error: "bg-red-900"
};

export function DevConsole() {
  const [state, setState] = useState<ConsoleState>(devConsole.getState());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to console state changes
  useEffect(() => {
    const unsubscribe = devConsole.subscribe(setState);
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (state.autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [state.logs, state.autoScroll]);

  if (!state.isOpen) {
    return null;
  }

  const filteredLogs = devConsole.getFilteredLogs();
  const stats = devConsole.getStats();

  const handleExportJSON = () => {
    const json = devConsole.exportLogs();
    downloadFile(json, "console-logs.json", "application/json");
  };

  const handleExportCSV = () => {
    const csv = devConsole.exportLogsAsCSV();
    downloadFile(csv, "console-logs.csv", "text/csv");
  };

  const handleCopyLog = (id: number, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 bg-gray-950 border-t border-gray-800 flex flex-col z-50 font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-white">Dev Console</h3>
          <div className="flex gap-2 text-xs text-gray-400">
            <span>Total: {stats.totalLogs}</span>
            <span>Debug: {stats.byLevel.debug}</span>
            <span>Info: {stats.byLevel.info}</span>
            <span>Warn: {stats.byLevel.warn}</span>
            <span>Error: {stats.byLevel.error}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => devConsole.toggleAutoScroll()}
            className={`text-xs ${state.autoScroll ? "text-green-500" : "text-gray-500"}`}
            title="Toggle auto-scroll"
          >
            {state.autoScroll ? "Auto" : "Manual"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportJSON}
            className="text-xs"
            title="Export as JSON"
          >
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCSV}
            className="text-xs"
            title="Export as CSV"
          >
            CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => devConsole.clear()}
            className="text-xs text-red-500"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => devConsole.close()}
            className="text-xs"
            title="Close console"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-800 bg-gray-900">
        <div className="flex gap-1">
          {(["all", "debug", "info", "warn", "error"] as const).map(level => (
            <Button
              key={level}
              size="sm"
              variant={state.filter === level ? "default" : "outline"}
              onClick={() => devConsole.setFilter(level)}
              className="text-xs"
            >
              {level}
            </Button>
          ))}
        </div>

        <Input
          type="text"
          placeholder="Search logs..."
          value={state.searchQuery}
          onChange={e => devConsole.setSearchQuery(e.target.value)}
          className="flex-1 h-7 text-xs bg-gray-800 border-gray-700"
        />
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-y-auto bg-gray-950 p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {state.logs.length === 0 ? "No logs yet" : "No logs match filter"}
          </div>
        ) : (
          filteredLogs.map(log => (
            <div
              key={log.id}
              className={`p-2 rounded text-xs font-mono ${LOG_LEVEL_BG[log.level]} hover:bg-gray-800 transition cursor-pointer group`}
              onClick={() => handleCopyLog(log.id, log.message)}
              title="Click to copy"
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0 w-8">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`flex-shrink-0 w-12 font-bold ${LOG_LEVEL_COLORS[log.level]}`}>
                  {log.level.toUpperCase()}
                </span>
                <span className="text-gray-400 flex-shrink-0 w-16">
                  [{log.source}]
                </span>
                <span className="flex-1 text-white break-words">{log.message}</span>
                {copiedId === log.id && (
                  <span className="text-green-500 flex-shrink-0">✓</span>
                )}{" "}
              </div>

              {log.data && (
                <div className="ml-28 mt-1 text-gray-400 break-words">
                  {typeof log.data === "string"
                    ? log.data
                    : JSON.stringify(log.data, null, 2)}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

/**
 * Helper to download file
 */
function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default DevConsole;
