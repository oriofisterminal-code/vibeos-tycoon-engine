/**
 * VibeOS Game Store
 * 
 * Design: Normalized state with Zustand
 * - Single source of truth for all game state
 * - Normalized entities for efficient lookups
 * - Immer middleware for immutable updates
 * - Event emission on state changes
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  NormalizedGameState,
  Saga,
  Chapter,
  Choice,
  Employee,
  Company,
  APAllocation,
  GameEvent,
  RandomEvent,
  TechStack,
  SagaStatus,
  EmployeeStatus,
  EventType
} from "@/types";
import { eventBus } from "@/lib/eventBus";

interface GameStore extends NormalizedGameState {
  // Initialization
  initializeGame: (company: Company, sagas: Saga[], employees: Employee[]) => void;
  
  // Saga management
  startSaga: (sagaId: number) => void;
  startChapter: (chapterId: number) => void;
  makeChoice: (choiceId: number) => void;
  completeSaga: (sagaId: number) => void;
  
  // Employee management
  hireEmployee: (employee: Employee) => void;
  fireEmployee: (employeeId: number) => void;
  updateEmployeeStress: (employeeId: number, delta: number) => void;
  updateEmployeeMorale: (employeeId: number, delta: number) => void;
  
  // Economy
  earnMoney: (amount: number, reason: string) => void;
  spendMoney: (amount: number, reason: string) => void;
  updateReputation: (delta: number) => void;
  
  // AP management
  allocateAP: (allocations: { sagaId: number; percentage: number }[]) => void;
  spendAP: (sagaId: number, amount: number) => void;
  
  // Day progression
  advanceDay: () => void;
  
  // Events
  addEvent: (event: Omit<GameEvent, "id">) => void;
  
  // Utilities
  getSaga: (sagaId: number) => Saga | undefined;
  getEmployee: (employeeId: number) => Employee | undefined;
  getCompany: () => Company;
  getAPAllocation: (dayNumber: number) => APAllocation | null;
}

const createInitialState = (): NormalizedGameState => ({
  sagas: {},
  chapters: {},
  choices: {},
  employees: {},
  companies: {},
  apAllocations: {},
  gameEvents: {},
  randomEvents: {},
  techStacks: {},
  sagaIds: [],
  employeeIds: [],
  eventIds: [],
  currentCompanyId: 1,
  currentDayNumber: 1,
  isPaused: false
});

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    initializeGame: (company, sagas, employees) => {
      set(state => {
        // Add company
        state.companies[company.id] = company;
        state.currentCompanyId = company.id;

        // Add sagas
        sagas.forEach(saga => {
          state.sagas[saga.id] = saga;
          state.sagaIds.push(saga.id);
        });

        // Add employees
        employees.forEach(employee => {
          state.employees[employee.id] = employee;
          state.employeeIds.push(employee.id);
        });

        // Emit game started event
        const eventId = Math.max(0, ...Object.keys(state.gameEvents).map(Number)) + 1;
        state.gameEvents[eventId] = {
          id: eventId,
          type: EventType.GAME_STARTED,
          timestamp: Date.now(),
          dayNumber: 1,
          data: { companyId: company.id }
        };
        state.eventIds.push(eventId);
      });

      // Emit to event bus
      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0),
        type: EventType.GAME_STARTED,
        timestamp: Date.now(),
        dayNumber: 1,
        data: { companyId: company.id }
      });
    },

    // ========================================================================
    // SAGA MANAGEMENT
    // ========================================================================

    startSaga: (sagaId: number) => {
      set(state => {
        const saga = state.sagas[sagaId];
        if (!saga) return;

        saga.status = SagaStatus.IN_PROGRESS;
        saga.startedAt = Date.now();

        // Start first chapter
        const firstChapter = Object.values(state.chapters).find(
          (ch: any) => ch.sagaId === sagaId && ch.sequenceNumber === 1
        ) as Chapter | undefined;
        if (firstChapter) {
          firstChapter.status = "in_progress" as any;
          saga.currentChapterId = firstChapter.id;
        }
      });

      const state = get();
      const saga = state.sagas[sagaId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.SAGA_STARTED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "saga",
        entityId: sagaId,
        data: { sagaId, sagaName: saga?.name }
      });
    },

    startChapter: (chapterId: number) => {
      set(state => {
        const chapter = state.chapters[chapterId];
        if (!chapter) return;

        chapter.status = "in_progress" as any;
      });

      const state = get();
      const chapter = state.chapters[chapterId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.CHAPTER_STARTED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "saga",
        entityId: chapter?.sagaId,
        data: { chapterId, sagaId: chapter?.sagaId }
      });
    },

    makeChoice: (choiceId: number) => {
      set(state => {
        const choice = state.choices[choiceId];
        const chapter = state.chapters[choice?.chapterId];
        if (!choice || !chapter) return;

        chapter.selectedChoiceId = choiceId;
        chapter.status = "completed" as any;

        // Move to next chapter if available
        if (choice.nextChapterId) {
          const nextChapter = state.chapters[choice.nextChapterId];
          if (nextChapter) {
            nextChapter.status = "available" as any;
          }
        }

        // Apply choice effects
        const company = state.companies[state.currentCompanyId];
        if (company) {
          company.money += choice.moneyReward;
          company.reputation += choice.reputationReward;
        }
      });

      const state = get();
      const choice = state.choices[choiceId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.CHOICE_MADE,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { choiceId, chapterId: choice?.chapterId }
      });
    },

    completeSaga: (sagaId: number) => {
      set(state => {
        const saga = state.sagas[sagaId];
        if (!saga) return;

        saga.status = SagaStatus.COMPLETED;
        saga.completedAt = Date.now();

        // Award rewards
        const company = state.companies[state.currentCompanyId];
        if (company) {
          company.money += saga.rewardMoney;
          company.reputation += saga.rewardReputation;
        }
      });

      const state = get();
      const saga = state.sagas[sagaId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.SAGA_COMPLETED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "saga",
        entityId: sagaId,
        data: {
          sagaId,
          rewards: {
            money: saga?.rewardMoney,
            reputation: saga?.rewardReputation
          }
        }
      });
    },

    // ========================================================================
    // EMPLOYEE MANAGEMENT
    // ========================================================================

    hireEmployee: (employee: Employee) => {
      set(state => {
        state.employees[employee.id] = employee;
        state.employeeIds.push(employee.id);

        const company = state.companies[state.currentCompanyId];
        if (company) {
          company.employeeIds.push(employee.id);
        }
      });

      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.EMPLOYEE_HIRED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "employee",
        entityId: employee.id,
        data: { employeeName: employee.name, role: employee.role }
      });
    },

    fireEmployee: (employeeId: number) => {
      set(state => {
        const employee = state.employees[employeeId];
        if (!employee) return;

        employee.status = EmployeeStatus.FIRED;
        employee.firedAt = Date.now();

        const company = state.companies[state.currentCompanyId];
        if (company) {
          company.employeeIds = company.employeeIds.filter((id: number) => id !== employeeId);
        }
      });

      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.EMPLOYEE_FIRED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "employee",
        entityId: employeeId,
        data: { employeeName: state.employees[employeeId]?.name }
      });
    },

    updateEmployeeStress: (employeeId: number, delta: number) => {
      set(state => {
        const employee = state.employees[employeeId];
        if (!employee) return;

        employee.stress = Math.max(0, Math.min(100, employee.stress + delta));
        employee.productivity = calculateProductivity(employee.stress, employee.morale);
      });

      const state = get();
      const employee = state.employees[employeeId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.EMPLOYEE_STRESS_CHANGED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "employee",
        entityId: employeeId,
        data: { delta, newStress: employee?.stress }
      });
    },

    updateEmployeeMorale: (employeeId: number, delta: number) => {
      set(state => {
        const employee = state.employees[employeeId];
        if (!employee) return;

        const oldMorale = employee.morale;
        employee.morale = Math.max(0, Math.min(100, employee.morale + delta));
        employee.productivity = calculateProductivity(employee.stress, employee.morale);

        // Check for quit
        if (oldMorale > 30 && employee.morale <= 30) {
          employee.status = EmployeeStatus.QUIT;
          employee.quitAt = Date.now();
        }
      });

      const state = get();
      const employee = state.employees[employeeId];
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.EMPLOYEE_MORALE_CHANGED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        entityType: "employee",
        entityId: employeeId,
        data: { delta, newMorale: employee?.morale }
      });
    },

    // ========================================================================
    // ECONOMY
    // ========================================================================

    earnMoney: (amount: number, reason: string) => {
      set(state => {
        const company = state.companies[state.currentCompanyId];
        if (!company) return;

        company.money += amount;
        company.totalEarned += amount;
      });

      const state = get();
      const eventIds = state.eventIds.length > 0 ? state.eventIds : [0];
      eventBus.emit({
        id: Math.max(...eventIds, 0) + 1,
        type: EventType.MONEY_EARNED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { amount, reason }
      });
    },

    spendMoney: (amount: number, reason: string) => {
      set(state => {
        const company = state.companies[state.currentCompanyId];
        if (!company) return;

        company.money -= amount;
        company.totalSpent += amount;
      });

      const state = get();
      const eventIds = state.eventIds.length > 0 ? state.eventIds : [0];
      eventBus.emit({
        id: Math.max(...eventIds, 0) + 1,
        type: EventType.MONEY_SPENT,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { amount, reason }
      });
    },

    updateReputation: (delta: number) => {
      set(state => {
        const company = state.companies[state.currentCompanyId];
        if (!company) return;

        company.reputation = Math.max(0, Math.min(100, company.reputation + delta));
      });

      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.REPUTATION_CHANGED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { delta, newReputation: state.companies[state.currentCompanyId]?.reputation }
      });
    },

    // ========================================================================
    // AP MANAGEMENT
    // ========================================================================

    allocateAP: (allocations: { sagaId: number; percentage: number }[]) => {
      set(state => {
        const apId = Math.max(0, ...Object.keys(state.apAllocations).map(Number)) + 1;
        state.apAllocations[apId] = {
          id: apId,
          dayNumber: state.currentDayNumber,
          allocations,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      });

      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.AP_ALLOCATED,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { allocations }
      });
    },

    spendAP: (sagaId: number, amount: number) => {
      set(state => {
        const company = state.companies[state.currentCompanyId];
        if (!company) return;

        company.usedAP += amount;
      });

      const state = get();
      eventBus.emit({
        id: Math.max(...state.eventIds, 0) + 1,
        type: EventType.AP_SPENT,
        timestamp: Date.now(),
        dayNumber: state.currentDayNumber,
        data: { sagaId, amount }
      });
    },

    // ========================================================================
    // DAY PROGRESSION
    // ========================================================================

    advanceDay: () => {
      set(state => {
        state.currentDayNumber += 1;

        // Reset AP
        const company = state.companies[state.currentCompanyId];
        if (company) {
          company.usedAP = 0;
        }
      });
    },

    // ========================================================================
    // EVENTS
    // ========================================================================

    addEvent: (event: Omit<GameEvent, "id">) => {
      set(state => {
        const eventId = Math.max(0, ...Object.keys(state.gameEvents).map((id: string) => Number(id))) + 1;
        const fullEvent: GameEvent = { ...event, id: eventId };
        state.gameEvents[eventId] = fullEvent;
        state.eventIds.push(eventId);
      });
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    getSaga: (sagaId: number) => {
      return get().sagas[sagaId];
    },

    getEmployee: (employeeId: number) => {
      return get().employees[employeeId];
    },

    getCompany: () => {
      return get().companies[get().currentCompanyId];
    },

    getAPAllocation: (dayNumber: number) => {
      const allocations = Object.values(get().apAllocations);
      return allocations.find(a => a.dayNumber === dayNumber) ?? null;
    }
  }))
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateProductivity(stress: number, morale: number): number {
  // Base productivity is 100
  // Stress reduces it (0-100 stress = 100-0 impact)
  // Morale boosts it (0-100 morale = 0-50 boost)
  const stressImpact = 100 - stress;
  const moraleBoost = (morale / 100) * 50;
  return Math.max(0, Math.min(150, stressImpact + moraleBoost));
}
