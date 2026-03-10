/**
 * Event Bus: Decoupled communication system
 * 
 * Design: Observer pattern with type-safe subscriptions
 * - Listeners subscribe to specific event types
 * - Events are processed synchronously in order
 * - Listeners can be unsubscribed at any time
 * 
 * FIXES:
 * - Removed async/await (listeners are sync)
 * - Added listener count limits to prevent memory leaks
 * - Improved error handling with listener isolation
 * - Added event deduplication check
 */

import { GameEvent, EventType } from "@/types";
import { devConsole } from "@/lib/devConsole";

type EventListener = (event: GameEvent) => void;

interface Subscription {
  unsubscribe: () => void;
}

interface EventBusConfig {
  maxHistorySize?: number;
  maxListenersPerEvent?: number;
  enableDeduplication?: boolean;
}

class EventBus {
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private eventHistory: GameEvent[] = [];
  private lastEventHash: string | null = null;
  private config: Required<EventBusConfig>;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 10000,
      maxListenersPerEvent: config.maxListenersPerEvent ?? 100,
      enableDeduplication: config.enableDeduplication ?? false
    };
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(eventType: EventType, listener: EventListener): Subscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;

    // Prevent memory leaks
    if (listeners.size >= this.config.maxListenersPerEvent) {
      devConsole.addLog(
        "warn",
        `Event bus: Max listeners (${this.config.maxListenersPerEvent}) reached for ${eventType}`,
        undefined,
        "eventBus"
      );
      return { unsubscribe: () => {} };
    }

    listeners.add(listener);

    return {
      unsubscribe: () => {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(listener: EventListener): Subscription {
    const subscriptions: Subscription[] = [];

    // Subscribe to all event types
    Object.values(EventType).forEach((eventType) => {
      subscriptions.push(this.subscribe(eventType as EventType, listener));
    });

    return {
      unsubscribe: () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      }
    };
  }

  /**
   * Emit event to all listeners (synchronous)
   */
  emit(event: GameEvent): void {
    // Deduplication check (optional)
    if (this.config.enableDeduplication) {
      const eventHash = this.hashEvent(event);
      if (eventHash === this.lastEventHash) {
        devConsole.addLog(
          "warn",
          `Event bus: Duplicate event detected, skipping ${event.type}`,
          undefined,
          "eventBus"
        );
        return;
      }
      this.lastEventHash = eventHash;
    }

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Call listeners (synchronous, isolated error handling)
    const listeners = this.listeners.get(event.type);
    if (listeners && listeners.size > 0) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          devConsole.addLog(
            "error",
            `Event bus: Error in listener for ${event.type}: ${errorMsg}`,
            error,
            "eventBus"
          );
          // Continue with other listeners even if one fails
        }
      });
    }
  }

  /**
   * Get event history with optional filtering
   */
  getHistory(filter?: { type?: EventType; limit?: number }): GameEvent[] {
    let history = [...this.eventHistory];

    if (filter?.type) {
      history = history.filter(e => e.type === filter.type);
    }

    if (filter?.limit && filter.limit > 0) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Clear history (for testing or reset)
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.lastEventHash = null;
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size ?? 0;
    }

    let total = 0;
    this.listeners.forEach(listeners => {
      total += listeners.size;
    });
    return total;
  }

  /**
   * Get event history size
   */
  getHistorySize(): number {
    return this.eventHistory.length;
  }

  /**
   * Get all listener counts by event type
   */
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.listeners.forEach((listeners, eventType) => {
      stats[eventType] = listeners.size;
    });
    return stats;
  }

  /**
   * Hash event for deduplication
   */
  private hashEvent(event: GameEvent): string {
    return `${event.type}:${event.entityId}:${event.timestamp}`;
  }

  /**
   * Remove all listeners (for cleanup)
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// Singleton instance with production config
export const eventBus = new EventBus({
  maxHistorySize: 10000,
  maxListenersPerEvent: 100,
  enableDeduplication: false
});

export default eventBus;
