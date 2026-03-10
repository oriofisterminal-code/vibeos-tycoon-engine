/**
 * Game Store Tests
 * Validates store actions and state management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import { Company, Saga, Employee, EmployeeRole, EmployeeStatus, SagaStatus } from "@/types";

describe("Game Store", () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.setState({
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
  });

  describe("Initialization", () => {
    it("initializes game with company and sagas", () => {
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

      const sagas: Saga[] = [
        {
          id: 1,
          name: "Test Saga",
          description: "Test",
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
        }
      ];

      const store = useGameStore.getState();
      store.initializeGame(company, sagas, []);

      const finalStore = useGameStore.getState();
      expect(finalStore.getCompany()?.name).toBe("Test Company");
      expect(finalStore.sagaIds.length).toBe(1);
    });
  });

  describe("Employee Management", () => {
    beforeEach(() => {
      const company: Company = {
        id: 1,
        name: "Test",
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

      useGameStore.getState().initializeGame(company, [], []);
    });

    it("hires employee successfully", () => {
      const employee: Employee = {
        id: 1,
        name: "John Dev",
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

      const store = useGameStore.getState();
      const result = store.hireEmployee(employee);

      expect(result).toBe(true);
      expect(store.getCompany()?.employeeIds.length).toBe(1);
      expect(store.getEmployee(1)?.name).toBe("John Dev");
    });

    it("fires employee successfully", () => {
      const store = useGameStore.getState();

      const employee: Employee = {
        id: 1,
        name: "John",
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

      store.hireEmployee(employee);
      const result = store.fireEmployee(1);

      expect(result).toBe(true);
      expect(store.getEmployee(1)?.status).toBe(EmployeeStatus.FIRED);
    });

    it("updates employee stress correctly", () => {
      const store = useGameStore.getState();

      const employee: Employee = {
        id: 1,
        name: "John",
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

      store.hireEmployee(employee);
      store.updateEmployeeStress(1, 10);

      expect(store.getEmployee(1)?.stress).toBe(40);
    });

    it("clamps stress between 0 and 100", () => {
      const store = useGameStore.getState();

      const employee: Employee = {
        id: 1,
        name: "John",
        role: EmployeeRole.DEVELOPER,
        status: EmployeeStatus.ACTIVE,
        coding: 85,
        design: 40,
        leadership: 50,
        testing: 60,
        stress: 95,
        morale: 75,
        productivity: 85,
        baseSalary: 5000,
        currentSalary: 5000,
        hiredAt: Date.now(),
        firedAt: null,
        quitAt: null
      };

      store.hireEmployee(employee);
      store.updateEmployeeStress(1, 20);

      expect(store.getEmployee(1)?.stress).toBe(100);
    });
  });

  describe("Economy", () => {
    beforeEach(() => {
      const company: Company = {
        id: 1,
        name: "Test",
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

      useGameStore.getState().initializeGame(company, [], []);
    });

    it("earns money successfully", () => {
      const store = useGameStore.getState();
      const initialMoney = store.getCompany()?.money ?? 0;

      store.earnMoney(1000, "Test");

      expect(store.getCompany()?.money).toBe(initialMoney + 1000);
    });

    it("prevents earning negative money", () => {
      const store = useGameStore.getState();
      const result = store.earnMoney(-1000, "Test");

      expect(result).toBe(false);
    });

    it("spends money successfully", () => {
      const store = useGameStore.getState();
      const initialMoney = store.getCompany()?.money ?? 0;

      store.spendMoney(1000, "Test");

      expect(store.getCompany()?.money).toBe(initialMoney - 1000);
    });

    it("prevents spending more than available", () => {
      const store = useGameStore.getState();
      const result = store.spendMoney(100000, "Test");

      expect(result).toBe(false);
    });

    it("updates reputation correctly", () => {
      const store = useGameStore.getState();
      const initialReputation = store.getCompany()?.reputation ?? 0;

      store.updateReputation(10);

      expect(store.getCompany()?.reputation).toBe(initialReputation + 10);
    });
  });

  describe("AP Management", () => {
    beforeEach(() => {
      const company: Company = {
        id: 1,
        name: "Test",
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

      useGameStore.getState().initializeGame(company, [], []);
    });

    it("allocates AP successfully", () => {
      const store = useGameStore.getState();
      const result = store.allocateAP([
        { sagaId: 1, percentage: 50 },
        { sagaId: 2, percentage: 50 }
      ]);

      expect(result).toBe(true);
    });

    it("prevents zero allocation", () => {
      const store = useGameStore.getState();
      const result = store.allocateAP([]);

      expect(result).toBe(false);
    });

    it("spends AP successfully", () => {
      const store = useGameStore.getState();
      const result = store.spendAP(1, 10);

      expect(result).toBe(true);
      expect(store.getCompany()?.usedAP).toBe(10);
    });

    it("prevents negative AP spending", () => {
      const store = useGameStore.getState();
      const result = store.spendAP(1, -10);

      expect(result).toBe(false);
    });
  });

  describe("Day Progression", () => {
    beforeEach(() => {
      const company: Company = {
        id: 1,
        name: "Test",
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

      useGameStore.getState().initializeGame(company, [], []);
    });

    it("advances day correctly", () => {
      const store = useGameStore.getState();
      const initialDay = store.currentDayNumber;

      store.advanceDay();
      const updatedStore = useGameStore.getState();

      expect(updatedStore.currentDayNumber).toBe(initialDay + 1);
    });

    it("resets AP on day advance", () => {
      const store = useGameStore.getState();
      store.spendAP(1, 50);
      let company = store.getCompany();
      expect(company?.usedAP).toBe(50);

      store.advanceDay();
      const updatedStore = useGameStore.getState();
      company = updatedStore.getCompany();

      expect(company?.usedAP).toBe(0);
    });
  });
});
