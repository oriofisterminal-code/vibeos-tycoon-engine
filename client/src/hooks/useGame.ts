/**
 * useGame Hook
 * 
 * Design: React hook for game state and actions
 * - Access game store
 * - Subscribe to events
 * - Manage game lifecycle
 */

import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { eventBus } from "@/lib/eventBus";
import { simulationEngine } from "@/lib/simulationEngine";
import { gameInitializer } from "@/lib/gameInitializer";
import { GameEvent, EventType } from "@/types";

export interface UseGameReturn {
  // State
  isInitialized: boolean;
  isPaused: boolean;
  currentDay: number;
  
  // Company
  companyName: string;
  money: number;
  reputation: number;
  employeeCount: number;
  
  // Actions
  startGame: (companyName: string, difficulty: string) => Promise<void>;
  pauseGame: () => void;
  resumeGame: () => void;
  advanceDay: () => void;
  
  // Events
  recentEvents: GameEvent[];
  onEvent: (callback: (event: GameEvent) => void) => () => void;
}

export function useGame(): UseGameReturn {
  const store = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [recentEvents, setRecentEvents] = useState<GameEvent[]>([]);

  // Initialize game
  const startGame = useCallback(
    async (companyName: string, difficulty: string = "normal") => {
      const success = await gameInitializer.initializeGame({
        companyName,
        difficulty: difficulty as any
      });

      if (success) {
        setIsInitialized(true);
      }
    },
    []
  );

  // Pause game
  const pauseGame = useCallback(() => {
    store.isPaused = true;
  }, [store]);

  // Resume game
  const resumeGame = useCallback(() => {
    store.isPaused = false;
  }, [store]);

  // Advance day
  const advanceDay = useCallback(() => {
    if (!store.isPaused) {
      simulationEngine.simulateDay();
    }
  }, [store]);

  // Subscribe to events
  const onEvent = useCallback(
    (callback: (event: GameEvent) => void) => {
      const subscription = eventBus.subscribeAll(callback);
      return () => subscription.unsubscribe();
    },
    []
  );

  // Set up event listener for recent events
  useEffect(() => {
    const subscription = eventBus.subscribeAll((event) => {
      setRecentEvents((prev) => {
        const updated = [event, ...prev];
        return updated.slice(0, 20); // Keep last 20 events
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const company = store.getCompany();

  return {
    isInitialized,
    isPaused: store.isPaused,
    currentDay: store.currentDayNumber,
    companyName: company?.name ?? "Unknown",
    money: company?.money ?? 0,
    reputation: company?.reputation ?? 0,
    employeeCount: company?.employeeIds.length ?? 0,
    startGame,
    pauseGame,
    resumeGame,
    advanceDay,
    recentEvents,
    onEvent
  };
}

export default useGame;
