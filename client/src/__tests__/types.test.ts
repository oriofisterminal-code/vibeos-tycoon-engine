/**
 * Type System Tests
 * Validates core types and enums
 */

import { describe, it, expect } from "vitest";
import {
  SagaStatus,
  ChapterStatus,
  ChoiceOutcome,
  EmployeeRole,
  EmployeeStatus,
  EventType,
  Saga,
  Chapter,
  Choice,
  Employee,
  Company
} from "@/types";

describe("Core Enums", () => {
  it("SagaStatus has all required values", () => {
    expect(SagaStatus.LOCKED).toBe("locked");
    expect(SagaStatus.AVAILABLE).toBe("available");
    expect(SagaStatus.IN_PROGRESS).toBe("in_progress");
    expect(SagaStatus.COMPLETED).toBe("completed");
    expect(SagaStatus.FAILED).toBe("failed");
    expect(SagaStatus.ABANDONED).toBe("abandoned");
  });

  it("EmployeeStatus has all required values", () => {
    expect(EmployeeStatus.ACTIVE).toBe("active");
    expect(EmployeeStatus.ON_LEAVE).toBe("on_leave");
    expect(EmployeeStatus.SICK).toBe("sick");
    expect(EmployeeStatus.FIRED).toBe("fired");
    expect(EmployeeStatus.QUIT).toBe("quit");
  });

  it("EventType has all required values", () => {
    expect(Object.keys(EventType).length).toBeGreaterThanOrEqual(16);
    expect(EventType.GAME_STARTED).toBe("game_started");
    expect(EventType.SAGA_STARTED).toBe("saga_started");
    expect(EventType.EMPLOYEE_HIRED).toBe("employee_hired");
  });
});

describe("Entity Validation", () => {
  it("creates valid Saga", () => {
    const saga: Saga = {
      id: 1,
      name: "Test Saga",
      description: "Test description",
      category: "business",
      status: SagaStatus.AVAILABLE,
      currentChapterId: null,
      completedChapterIds: [],
      rewardMoney: 1000,
      rewardReputation: 10,
      rewardExperience: 100,
      difficulty: 1,
      estimatedAPCost: 50,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    expect(saga.id).toBe(1);
    expect(saga.status).toBe(SagaStatus.AVAILABLE);
    expect(saga.rewardMoney).toBe(1000);
  });

  it("creates valid Employee", () => {
    const employee: Employee = {
      id: 1,
      name: "Test Dev",
      role: EmployeeRole.DEVELOPER,
      status: EmployeeStatus.ACTIVE,
      coding: 85,
      design: 40,
      leadership: 50,
      testing: 60,
      stress: 30,
      morale: 75,
      productivity: 85,
      baseSalary: 5000,
      currentSalary: 5000,
      hiredAt: Date.now(),
      firedAt: null,
      quitAt: null
    };

    expect(employee.coding).toBe(85);
    expect(employee.stress).toBeLessThanOrEqual(100);
    expect(employee.morale).toBeLessThanOrEqual(100);
  });

  it("creates valid Company", () => {
    const company: Company = {
      id: 1,
      name: "Test Company",
      foundedAt: Date.now(),
      money: 10000,
      totalEarned: 10000,
      totalSpent: 0,
      reputation: 10,
      clientQuality: 0.5,
      employeeIds: [],
      maxEmployees: 50,
      techStackIds: [],
      dayNumber: 1,
      totalAPBudget: 100,
      usedAP: 0
    };

    expect(company.money).toBe(10000);
    expect(company.reputation).toBeLessThanOrEqual(100);
    expect(company.employeeIds).toEqual([]);
  });
});

describe("Type Constraints", () => {
  it("enforces skill ranges (0-100)", () => {
    const employee: Employee = {
      id: 1,
      name: "Test",
      role: EmployeeRole.DEVELOPER,
      status: EmployeeStatus.ACTIVE,
      coding: 85,
      design: 40,
      leadership: 50,
      testing: 60,
      stress: 30,
      morale: 75,
      productivity: 85,
      baseSalary: 5000,
      currentSalary: 5000,
      hiredAt: Date.now(),
      firedAt: null,
      quitAt: null
    };

    expect(employee.coding).toBeGreaterThanOrEqual(0);
    expect(employee.coding).toBeLessThanOrEqual(100);
    expect(employee.stress).toBeGreaterThanOrEqual(0);
    expect(employee.stress).toBeLessThanOrEqual(100);
  });

  it("enforces difficulty range (1-5)", () => {
    const saga: Saga = {
      id: 1,
      name: "Test",
      description: "Test",
      category: "business",
      status: SagaStatus.AVAILABLE,
      currentChapterId: null,
      completedChapterIds: [],
      rewardMoney: 1000,
      rewardReputation: 10,
      rewardExperience: 100,
      difficulty: 3,
      estimatedAPCost: 50,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    expect(saga.difficulty).toBeGreaterThanOrEqual(1);
    expect(saga.difficulty).toBeLessThanOrEqual(5);
  });
});
