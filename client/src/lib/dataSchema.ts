/**
 * Data Schema Definitions
 * 
 * Comprehensive schema validation for all game data
 * - Type-safe schema definitions
 * - Validation rules with error messages
 * - Schema composition for reusability
 */

import { z } from "zod";
import { SagaStatus, ChapterStatus, ChoiceOutcome, EmployeeRole, EmployeeStatus } from "@/types";

// ============================================================================
// PRIMITIVE SCHEMAS
// ============================================================================

const IdSchema = z.number().int().positive("ID must be a positive integer");
const NameSchema = z.string().min(1, "Name is required").max(100, "Name too long");
const DescriptionSchema = z.string().max(500, "Description too long");
const PercentageSchema = z.number().min(0).max(100, "Percentage must be 0-100");
const MoneySchema = z.number().nonnegative("Money cannot be negative");
const ReputationSchema = z.number().min(0).max(100, "Reputation must be 0-100");

// ============================================================================
// SAGA & CHAPTER SCHEMAS
// ============================================================================

export const SagaSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  description: DescriptionSchema,
  difficulty: z.number().min(1).max(5, "Difficulty must be 1-5"),
  status: z.string().default(SagaStatus.LOCKED),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  currentChapterId: IdSchema.optional(),
  apRequired: z.number().nonnegative().default(0),
  rewardMoney: MoneySchema.default(0),
  rewardReputation: z.number().default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ChapterSchema = z.object({
  id: IdSchema,
  sagaId: IdSchema,
  name: NameSchema,
  description: DescriptionSchema,
  sequenceNumber: z.number().positive("Sequence must be positive"),
  status: z.string().default(ChapterStatus.LOCKED),
  selectedChoiceId: IdSchema.optional(),
  apCost: z.number().nonnegative().default(0),
  eventTriggers: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ChoiceSchema = z.object({
  id: IdSchema,
  chapterId: IdSchema,
  text: z.string().min(1, "Choice text required").max(200),
  outcome: z.string().default(ChoiceOutcome.SUCCESS),
  nextChapterId: IdSchema.optional(),
  moneyReward: MoneySchema.default(0),
  reputationReward: z.number().default(0),
  apReward: z.number().nonnegative().default(0),
  stressModifier: z.number().default(0),
  requirements: z.object({
    minReputation: ReputationSchema.optional(),
    minMoney: MoneySchema.optional(),
    minEmployees: z.number().nonnegative().optional(),
    requiredSkills: z.array(z.string()).optional()
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// ============================================================================
// EMPLOYEE SCHEMAS
// ============================================================================

export const EmployeeSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  role: z.string(),
  status: z.string().default(EmployeeStatus.ACTIVE),
  salary: MoneySchema,
  stress: PercentageSchema.default(50),
  morale: PercentageSchema.default(70),
  productivity: PercentageSchema.default(75),
  skills: z.record(z.string(), z.number().min(0).max(100)).default({}),
  hiredAt: z.number().optional(),
  firedAt: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// ============================================================================
// COMPANY SCHEMAS
// ============================================================================

export const CompanySchema = z.object({
  id: IdSchema,
  name: NameSchema,
  money: MoneySchema.default(10000),
  reputation: ReputationSchema.default(50),
  dayNumber: z.number().positive().default(1),
  totalEmployees: z.number().nonnegative().default(0),
  totalRevenue: MoneySchema.default(0),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// ============================================================================
// AP ALLOCATION SCHEMAS
// ============================================================================

export const APAllocationSchema = z.object({
  dayNumber: z.number().positive(),
  totalAP: z.number().positive(),
  allocations: z.array(
    z.object({
      sagaId: IdSchema,
      percentage: PercentageSchema
    })
  ),
  timestamp: z.number().optional()
});

// ============================================================================
// GAME CONFIG SCHEMAS
// ============================================================================

export const GameConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  gameTitle: z.string().default("VibeOS Tycoon"),
  maxEmployees: z.number().positive().default(50),
  startingMoney: MoneySchema.default(10000),
  startingReputation: ReputationSchema.default(50),
  apPerDay: z.number().positive().default(100),
  difficultyMultiplier: z.number().positive().default(1.0),
  enableMods: z.boolean().default(true),
  enableHotReload: z.boolean().default(true),
  debugMode: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional()
});

// ============================================================================
// MOD SCHEMAS
// ============================================================================

export const ModManifestSchema = z.object({
  id: z.string().min(1, "Mod ID required"),
  name: NameSchema,
  version: z.string().default("1.0.0"),
  author: z.string().optional(),
  description: DescriptionSchema.optional(),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  dependencies: z.array(z.string()).default([]),
  conflicts: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const ModDataSchema = z.object({
  manifest: ModManifestSchema,
  sagas: z.array(SagaSchema).optional(),
  chapters: z.array(ChapterSchema).optional(),
  choices: z.array(ChoiceSchema).optional(),
  employees: z.array(EmployeeSchema).optional(),
  config: GameConfigSchema.optional()
});

// ============================================================================
// COLLECTION SCHEMAS
// ============================================================================

export const GameDataSchema = z.object({
  version: z.string().default("1.0.0"),
  timestamp: z.number().optional(),
  sagas: z.array(SagaSchema).default([]),
  chapters: z.array(ChapterSchema).default([]),
  choices: z.array(ChoiceSchema).default([]),
  employees: z.array(EmployeeSchema).default([]),
  config: GameConfigSchema.optional()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Saga = z.infer<typeof SagaSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type APAllocation = z.infer<typeof APAllocationSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;
export type ModManifest = z.infer<typeof ModManifestSchema>;
export type ModData = z.infer<typeof ModDataSchema>;
export type GameData = z.infer<typeof GameDataSchema>;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate data against schema and return result
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { valid: true; data: T } | { valid: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { valid: true, data: result.data };
  }
  
  const errors = result.error.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.join(".");
    return `${path || "root"}: ${issue.message}`;
  });
  
  return { valid: false, errors };
}

/**
 * Validate multiple items
 */
export function validateArray<T>(schema: z.ZodSchema<T>, items: unknown[]): { valid: true; data: T[] } | { valid: false; errors: Map<number, string[]> } {
  const errors = new Map<number, string[]>();
  const validItems: T[] = [];
  
  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      validItems.push(result.data);
    } else {
      const itemErrors = result.error.issues.map((issue: z.ZodIssue) => `${issue.path.join(".")}: ${issue.message}`);
      errors.set(index, itemErrors);
    }
  });
  
  if (errors.size === 0) {
    return { valid: true, data: validItems };
  }
  
  return { valid: false, errors };
}

export default {
  validateData,
  validateArray,
  SagaSchema,
  ChapterSchema,
  ChoiceSchema,
  EmployeeSchema,
  CompanySchema,
  APAllocationSchema,
  GameConfigSchema,
  ModManifestSchema,
  ModDataSchema,
  GameDataSchema
};
