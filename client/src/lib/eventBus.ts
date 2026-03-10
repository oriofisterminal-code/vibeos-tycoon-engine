/**
 * Event Bus: Decoupled communication system
 * 
 * Design: Observer pattern with type-safe subscriptions
 * - Listeners subscribe to specific event types
 * - Events are processed synchronously in order
 * - Listeners can be unsubscribed at any time
 */

import { GameEvent, EventType } from "@/types";

type EventListener = (event: GameEvent) => void | Promise<void>;

interface Subscription {
  unsubscribe: () => void;
}

class EventBus {
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private eventHistory: GameEvent[] = [];
  private maxHistorySize = 10000;

  /**
   * Subscribe to specific event type
   */
  subscribe(eventType: EventType, listener: EventListener): Subscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener);

    return {
      unsubscribe: () => {
        this.listeners.get(eventType)?.delete(listener);
      }
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(listener: EventListener): Subscription {
    const subscriptions = Array.from(Object.values(EventType)).map(eventType =>
      this.subscribe(eventType as EventType, listener)
    );

    return {
      unsubscribe: () => {
        subscriptions.forEach(sub => sub.unsubscribe());
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  async emit(event: GameEvent): Promise<void> {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Call listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: { type?: EventType; limit?: number }): GameEvent[] {
    let history = [...this.eventHistory];

    if (filter?.type) {
      history = history.filter(e => e.type === filter.type);
    }

    if (filter?.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * Clear history (for testing or reset)
   */
  clearHistory(): void {
    this.eventHistory = [];
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
}

// Singleton instance
export const eventBus = new EventBus();

export default eventBus;
