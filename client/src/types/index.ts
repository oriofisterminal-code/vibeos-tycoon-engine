/**
 * VibeOS Core Types
 * 
 * Design Philosophy: Normalized, immutable, event-driven
 * - All entities use numeric IDs for efficient lookups
 * - Events are the source of truth for state changes
 * - Timestamps in milliseconds (Unix epoch)
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export enum SagaStatus {
  LOCKED = "locked",           // Not yet available
  AVAILABLE = "available",     // Can be started
  IN_PROGRESS = "in_progress", // Currently active
  COMPLETED = "completed",     // Finished successfully
  FAILED = "failed",           // Failed to complete
  ABANDONED = "abandoned"      // Player gave up
}

export enum ChapterStatus {
  LOCKED = "locked",
  AVAILABLE = "available",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed"
}

export enum ChoiceOutcome {
  SUCCESS = "success",
  PARTIAL = "partial",
  FAILURE = "failure"
}

export enum EmployeeRole {
  DEVELOPER = "developer",
  DESIGNER = "designer",
  MANAGER = "manager",
  QA = "qa",
  DEVOPS = "devops"
}

export enum EmployeeStatus {
  ACTIVE = "active",
  ON_LEAVE = "on_leave",
  SICK = "sick",
  FIRED = "fired",
  QUIT = "quit"
}

export enum EventType {
  // Game lifecycle
  GAME_STARTED = "game_started",
  GAME_LOADED = "game_loaded",
  
  // AP system
  AP_ALLOCATED = "ap_allocated",
  AP_SPENT = "ap_spent",
  AP_RESET = "ap_reset",
  
  // Saga progression
  SAGA_STARTED = "saga_started",
  CHAPTER_STARTED = "chapter_started",
  CHOICE_MADE = "choice_made",
  SAGA_COMPLETED = "saga_completed",
  SAGA_FAILED = "saga_failed",
  
  // Employee management
  EMPLOYEE_HIRED = "employee_hired",
  EMPLOYEE_FIRED = "employee_fired",
  EMPLOYEE_QUIT = "employee_quit",
  EMPLOYEE_STRESS_CHANGED = "employee_stress_changed",
  EMPLOYEE_MORALE_CHANGED = "employee_morale_changed",
  
  // Economy
  MONEY_EARNED = "money_earned",
  MONEY_SPENT = "money_spent",
  REPUTATION_CHANGED = "reputation_changed",
  
  // Random events
  RANDOM_EVENT_TRIGGERED = "random_event_triggered",
  RANDOM_EVENT_RESOLVED = "random_event_resolved"
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Saga: A branching story arc with multiple chapters
 * Each saga represents a major goal or project
 */
export interface Saga {
  id: number;
  name: string;
  description: string;
  category: "business" | "technical" | "personal" | "crisis";
  status: SagaStatus;
  
  // Progression
  currentChapterId: number | null;
  completedChapterIds: number[];
  
  // Rewards
  rewardMoney: number;
  rewardReputation: number;
  rewardExperience: number;
  
  // Metadata
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedAPCost: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

/**
 * Chapter: A section within a saga with branching choices
 */
export interface Chapter {
  id: number;
  sagaId: number;
  sequenceNumber: number;
  title: string;
  description: string;
  status: ChapterStatus;
  
  // Choices available in this chapter
  choiceIds: number[];
  selectedChoiceId: number | null;
  
  // Requirements
  requiredAPCost: number;
  requiredEmployeeCount?: number;
  requiredReputation?: number;
  
  // Outcomes
  completedAt: number | null;
}

/**
 * Choice: A branching decision within a chapter
 * Affects subsequent chapters and game state
 */
export interface Choice {
  id: number;
  chapterId: number;
  text: string;
  description: string;
  
  // Consequences
  apCost: number;
  moneyReward: number;
  reputationReward: number;
  
  // Branching
  nextChapterId: number | null;
  outcome: ChoiceOutcome;
  
  // Conditional effects
  stressImpact: number; // -10 to +10
  moraleImpact: number; // -10 to +10
}

/**
 * Employee: Team member with skills and morale
 */
export interface Employee {
  id: number;
  name: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  
  // Skills (0-100)
  coding: number;
  design: number;
  leadership: number;
  testing: number;
  
  // State
  stress: number; // 0-100, affects productivity
  morale: number; // 0-100, affects retention
  productivity: number; // 0-100, calculated from stress/morale
  
  // Salary
  baseSalary: number;
  currentSalary: number;
  
  // Metadata
  hiredAt: number;
  firedAt: number | null;
  quitAt: number | null;
}

/**
 * Company: Player's company state
 */
export interface Company {
  id: number;
  name: string;
  foundedAt: number;
  
  // Finance
  money: number;
  totalEarned: number;
  totalSpent: number;
  
  // Reputation
  reputation: number; // 0-100
  clientQuality: number; // Affects reward multipliers
  
  // Employees
  employeeIds: number[];
  maxEmployees: number;
  
  // Technology
  techStackIds: number[];
  
  // Metadata
  dayNumber: number;
  totalAPBudget: number;
  usedAP: number;
}

/**
 * Action Point allocation: How player distributes daily AP
 */
export interface APAllocation {
  id: number;
  dayNumber: number;
  allocations: {
    sagaId: number;
    percentage: number; // 0-100
  }[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Event: Immutable record of state changes
 */
export interface GameEvent {
  id: number;
  type: EventType;
  timestamp: number;
  dayNumber: number;
  
  // Entity references
  entityType?: "saga" | "employee" | "company" | "choice";
  entityId?: number;
  
  // Event-specific data
  data: Record<string, any>;
  
  // Causality
  causedByEventId?: number;
}

/**
 * Random Event: Triggered events that affect game state
 */
export interface RandomEvent {
  id: number;
  name: string;
  description: string;
  probability: number; // 0-1, per day
  
  // Effects
  stressImpact: number;
  moraleImpact: number;
  moneyImpact: number;
  
  // Conditions
  minReputation?: number;
  maxReputation?: number;
  minEmployees?: number;
  maxEmployees?: number;
}

/**
 * Technology Stack: Tools/frameworks available
 */
export interface TechStack {
  id: number;
  name: string;
  category: "language" | "framework" | "tool" | "platform";
  
  // Effects on productivity
  productivityBonus: number; // 0-50%
  learningCost: number; // AP cost to learn
  
  // Metadata
  year: number; // When it became available
  deprecated: boolean;
}

// ============================================================================
// NORMALIZED STATE TYPES
// ============================================================================

/**
 * Normalized store structure for efficient lookups
 * Follows Redux normalization patterns
 */
export interface NormalizedGameState {
  // Entities
  sagas: Record<number, Saga>;
  chapters: Record<number, Chapter>;
  choices: Record<number, Choice>;
  employees: Record<number, Employee>;
  companies: Record<number, Company>;
  apAllocations: Record<number, APAllocation>;
  gameEvents: Record<number, GameEvent>;
  randomEvents: Record<number, RandomEvent>;
  techStacks: Record<number, TechStack>;
  
  // IDs for ordering
  sagaIds: number[];
  employeeIds: number[];
  eventIds: number[];
  
  // Current game state
  currentCompanyId: number;
  currentDayNumber: number;
  isPaused: boolean;
}

// ============================================================================
// QUERY/RESPONSE TYPES
// ============================================================================

export interface GameState {
  company: Company;
  sagas: Saga[];
  employees: Employee[];
  events: GameEvent[];
  apAllocation: APAllocation | null;
  currentDay: number;
}

export interface SagaProgress {
  saga: Saga;
  currentChapter: Chapter | null;
  availableChoices: Choice[];
  completionPercentage: number;
}

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  averageStress: number;
  averageMorale: number;
  totalMonthlyCost: number;
}

export interface EconomyStats {
  currentMoney: number;
  dailyIncome: number;
  dailyExpenses: number;
  reputation: number;
  clientQuality: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
