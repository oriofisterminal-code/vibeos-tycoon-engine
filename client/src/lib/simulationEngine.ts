/**
 * VibeOS Simulation Engine
 * 
 * Design: Core game loop and mechanics
 * - Daily AP budget calculation
 * - Saga progression and completion
 * - Employee stress/morale updates
 * - Economy simulation
 * - Random event triggering
 * 
 * OPTIMIZATIONS:
 * - Cached calculations
 * - Batch employee updates
 * - Efficient stat aggregation
 */

import { useGameStore } from "@/store/gameStore";
import { eventBus } from "@/lib/eventBus";
import {
  EventType,
  SagaStatus,
  EmployeeStatus
} from "@/types";

interface SimulationConfig {
  dailyAPBase: number;
  apPerEmployee: number;
  moraleMultiplier: number;
  carryoverPercentage: number;
  stressDecayPerDay: number;
  moraleGrowthPerDay: number;
  churnRiskPerDay: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  dailyAPBase: 100,
  apPerEmployee: 10,
  moraleMultiplier: 0.5,
  carryoverPercentage: 0.5,
  stressDecayPerDay: 2,
  moraleGrowthPerDay: 1,
  churnRiskPerDay: 0.01
};

export class SimulationEngine {
  private config: SimulationConfig;
  private apCache: Map<number, number> = new Map();
  private lastCacheDay = -1;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate daily AP budget based on company state
   * Cached per day to avoid recalculation
   */
  calculateDailyAP(companyId: number): number {
    const store = useGameStore.getState();
    const company = store.companies[companyId];

    if (!company) return this.config.dailyAPBase;

    // Check cache
    if (this.lastCacheDay === company.dayNumber && this.apCache.has(companyId)) {
      return this.apCache.get(companyId)!;
    }

    const activeEmployees = company.employeeIds.filter(id => {
      const emp = store.employees[id];
      return emp && emp.status === EmployeeStatus.ACTIVE;
    }).length;

    const baseAP = this.config.dailyAPBase;
    const employeeAP = activeEmployees * this.config.apPerEmployee;
    const moraleBonus = (company.reputation / 100) * this.config.moraleMultiplier * 20;

    const total = Math.floor(baseAP + employeeAP + moraleBonus);

    // Update cache
    if (this.lastCacheDay !== company.dayNumber) {
      this.apCache.clear();
      this.lastCacheDay = company.dayNumber;
    }
    this.apCache.set(companyId, total);

    return total;
  }

  /**
   * Allocate AP to sagas based on priority percentages
   */
  allocateAPToSagas(
    allocations: { sagaId: number; percentage: number }[]
  ): Map<number, number> {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];
    if (!company) return new Map();

    const totalAP = this.calculateDailyAP(company.id);
    const allocation = new Map<number, number>();

    // Validate percentages sum to 100
    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
    if (totalPercentage === 0) return allocation;

    for (const { sagaId, percentage } of allocations) {
      const ap = Math.floor((percentage / totalPercentage) * totalAP);
      allocation.set(sagaId, ap);
    }

    return allocation;
  }

  /**
   * Update employee stress and morale daily (batch operation)
   */
  updateEmployeeStatesDaily(): void {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) return;

    for (const employeeId of company.employeeIds) {
      const employee = store.employees[employeeId];

      if (!employee || employee.status !== EmployeeStatus.ACTIVE) continue;

      // Stress naturally decays
      if (employee.stress > 0) {
        store.updateEmployeeStress(employeeId, -this.config.stressDecayPerDay);
      }

      // Morale naturally grows
      if (employee.morale < 100) {
        store.updateEmployeeMorale(employeeId, this.config.moraleGrowthPerDay);
      }

      // Check for churn risk
      const churnProbability = this.config.churnRiskPerDay * (employee.stress / 100);
      if (Math.random() < churnProbability && employee.morale < 30) {
        store.fireEmployee(employeeId);
        eventBus.emit({
          id: store._getNextEventId(),
          type: EventType.EMPLOYEE_QUIT,
          timestamp: Date.now(),
          dayNumber: store.currentDayNumber,
          entityType: "employee",
          entityId: employeeId,
          data: { employeeName: employee.name, reason: "Low morale" }
        });
      }
    }
  }

  /**
   * Process daily salary expenses
   */
  processSalaries(): void {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) return;

    let totalSalaries = 0;
    for (const employeeId of company.employeeIds) {
      const employee = store.employees[employeeId];
      if (employee && employee.status === EmployeeStatus.ACTIVE) {
        totalSalaries += employee.currentSalary;
      }
    }

    if (totalSalaries > 0) {
      store.spendMoney(totalSalaries, "Employee salaries");
    }
  }

  /**
   * Calculate productivity bonus from tech stack
   */
  calculateTechStackBonus(): number {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) return 1.0;

    let bonus = 1.0;
    for (const techId of company.techStackIds) {
      const tech = store.techStacks[techId];
      if (tech) {
        bonus *= 1 + tech.productivityBonus / 100;
      }
    }

    return bonus;
  }

  /**
   * Calculate saga reward multiplier based on company state
   */
  calculateRewardMultiplier(): number {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) return 1.0;

    // Reputation affects client quality
    const reputationMultiplier = 0.5 + (company.reputation / 100) * 1.5;

    // Tech stack affects quality
    const techMultiplier = this.calculateTechStackBonus();

    return reputationMultiplier * techMultiplier;
  }

  /**
   * Simulate a full day cycle
   */
  simulateDay(): void {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) return;

    // 1. Process salaries
    this.processSalaries();

    // 2. Update employee states
    this.updateEmployeeStatesDaily();

    // 3. Advance day
    store.advanceDay();

    // Emit day advanced event
    eventBus.emit({
      id: store._getNextEventId(),
      type: EventType.AP_RESET,
      timestamp: Date.now(),
      dayNumber: store.currentDayNumber,
      data: {
        dayNumber: store.currentDayNumber,
        dailyAP: this.calculateDailyAP(company.id)
      }
    });
  }

  /**
   * Check if saga can be started (prerequisites met)
   */
  canStartSaga(sagaId: number): boolean {
    const store = useGameStore.getState();
    const saga = store.sagas[sagaId];

    if (!saga || saga.status !== SagaStatus.AVAILABLE) return false;

    // Check reputation requirement
    const firstChapter = Object.values(store.chapters).find(
      (ch: any) => ch.sagaId === sagaId && ch.sequenceNumber === 1
    );

    if (!firstChapter) return false;

    const company = store.companies[store.currentCompanyId];
    if (!company) return false;

    if (
      firstChapter.requiredReputation &&
      company.reputation < firstChapter.requiredReputation
    ) {
      return false;
    }

    if (
      firstChapter.requiredEmployeeCount &&
      company.employeeIds.length < firstChapter.requiredEmployeeCount
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get available sagas for player
   */
  getAvailableSagas(): number[] {
    const store = useGameStore.getState();
    const available: number[] = [];

    for (const sagaId of store.sagaIds) {
      if (this.canStartSaga(sagaId)) {
        available.push(sagaId);
      }
    }

    return available;
  }

  /**
   * Calculate financial health
   */
  getFinancialHealth(): {
    balance: number;
    monthlyBurn: number;
    runway: number;
    status: "healthy" | "warning" | "critical";
  } {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) {
      return { balance: 0, monthlyBurn: 0, runway: 0, status: "critical" };
    }

    let monthlyBurn = 0;
    for (const employeeId of company.employeeIds) {
      const employee = store.employees[employeeId];
      if (employee && employee.status === EmployeeStatus.ACTIVE) {
        monthlyBurn += employee.currentSalary * 30;
      }
    }

    const runway = monthlyBurn > 0 ? company.money / monthlyBurn : Infinity;

    let status: "healthy" | "warning" | "critical" = "healthy";
    if (runway < 1) status = "critical";
    else if (runway < 3) status = "warning";

    return {
      balance: company.money,
      monthlyBurn,
      runway,
      status
    };
  }

  /**
   * Get company statistics (optimized aggregation)
   */
  getCompanyStats(): {
    totalEmployees: number;
    activeEmployees: number;
    averageStress: number;
    averageMorale: number;
    totalProductivity: number;
  } {
    const store = useGameStore.getState();
    const company = store.companies[store.currentCompanyId];

    if (!company) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        averageStress: 0,
        averageMorale: 0,
        totalProductivity: 0
      };
    }

    let totalStress = 0;
    let totalMorale = 0;
    let totalProductivity = 0;
    let activeCount = 0;

    for (const employeeId of company.employeeIds) {
      const employee = store.employees[employeeId];
      if (employee && employee.status === EmployeeStatus.ACTIVE) {
        totalStress += employee.stress;
        totalMorale += employee.morale;
        totalProductivity += employee.productivity;
        activeCount++;
      }
    }

    return {
      totalEmployees: company.employeeIds.length,
      activeEmployees: activeCount,
      averageStress: activeCount > 0 ? totalStress / activeCount : 0,
      averageMorale: activeCount > 0 ? totalMorale / activeCount : 0,
      totalProductivity: activeCount > 0 ? totalProductivity / activeCount : 0
    };
  }

  /**
   * Clear cache (for testing or reset)
   */
  clearCache(): void {
    this.apCache.clear();
    this.lastCacheDay = -1;
  }
}

// Singleton instance
export const simulationEngine = new SimulationEngine();

export default simulationEngine;
