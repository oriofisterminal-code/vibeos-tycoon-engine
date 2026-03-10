/**
 * State Validator
 * 
 * Validates game state consistency and integrity
 * Useful for debugging and catching state corruption early
 */

import { NormalizedGameState, EmployeeStatus, SagaStatus } from "@/types";

export interface ValidationError {
  severity: "error" | "warning";
  message: string;
  context?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate entire game state
 */
export function validateGameState(state: NormalizedGameState): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check companies
  if (!state.currentCompanyId || !state.companies[state.currentCompanyId]) {
    errors.push({
      severity: "error",
      message: "Current company not found",
      context: `currentCompanyId: ${state.currentCompanyId}`
    });
  }

  // Check saga references
  for (const sagaId of state.sagaIds) {
    if (!state.sagas[sagaId]) {
      errors.push({
        severity: "error",
        message: `Saga ${sagaId} referenced but not found`,
        context: "sagaIds"
      });
    }
  }

  // Check employee references
  for (const empId of state.employeeIds) {
    if (!state.employees[empId]) {
      errors.push({
        severity: "error",
        message: `Employee ${empId} referenced but not found`,
        context: "employeeIds"
      });
    }
  }

  // Check company employee references
  const company = state.companies[state.currentCompanyId];
  if (company) {
    for (const empId of company.employeeIds) {
      if (!state.employees[empId]) {
        errors.push({
          severity: "error",
          message: `Company references employee ${empId} but not found`,
          context: `company.employeeIds`
        });
      }

      const emp = state.employees[empId];
      if (emp && !state.employeeIds.includes(empId)) {
        warnings.push({
          severity: "warning",
          message: `Employee ${empId} in company but not in employeeIds`,
          context: "employeeIds"
        });
      }
    }
  }

  // Check saga chapters
  for (const sagaId of state.sagaIds) {
    const saga = state.sagas[sagaId];
    if (!saga) continue;

    // Check currentChapterId
    if (saga.currentChapterId && !state.chapters[saga.currentChapterId]) {
      errors.push({
        severity: "error",
        message: `Saga ${sagaId} references chapter ${saga.currentChapterId} but not found`,
        context: "saga.currentChapterId"
      });
    }

    // Check completedChapterIds
    for (const chapterId of saga.completedChapterIds) {
      if (!state.chapters[chapterId]) {
        errors.push({
          severity: "error",
          message: `Saga ${sagaId} references completed chapter ${chapterId} but not found`,
          context: "saga.completedChapterIds"
        });
      }
    }
  }

  // Check chapter saga references
  for (const chapterId in state.chapters) {
    const chapter = state.chapters[chapterId];
    if (!state.sagas[chapter.sagaId]) {
      errors.push({
        severity: "error",
        message: `Chapter ${chapterId} references saga ${chapter.sagaId} but not found`,
        context: "chapter.sagaId"
      });
    }
  }

  // Check choice chapter references
  for (const choiceId in state.choices) {
    const choice = state.choices[choiceId];
    if (!state.chapters[choice.chapterId]) {
      errors.push({
        severity: "error",
        message: `Choice ${choiceId} references chapter ${choice.chapterId} but not found`,
        context: "choice.chapterId"
      });
    }

    if (choice.nextChapterId && !state.chapters[choice.nextChapterId]) {
      warnings.push({
        severity: "warning",
        message: `Choice ${choiceId} references next chapter ${choice.nextChapterId} but not found`,
        context: "choice.nextChapterId"
      });
    }
  }

  // Check employee state validity
  for (const empId in state.employees) {
    const emp = state.employees[empId];

    // Check stress/morale ranges
    if (emp.stress < 0 || emp.stress > 100) {
      warnings.push({
        severity: "warning",
        message: `Employee ${empId} has invalid stress: ${emp.stress}`,
        context: "employee.stress"
      });
    }

    if (emp.morale < 0 || emp.morale > 100) {
      warnings.push({
        severity: "warning",
        message: `Employee ${empId} has invalid morale: ${emp.morale}`,
        context: "employee.morale"
      });
    }

    if (emp.productivity < 0 || emp.productivity > 100) {
      warnings.push({
        severity: "warning",
        message: `Employee ${empId} has invalid productivity: ${emp.productivity}`,
        context: "employee.productivity"
      });
    }

    // Check status consistency
    if (emp.status === EmployeeStatus.QUIT && !emp.quitAt) {
      warnings.push({
        severity: "warning",
        message: `Employee ${empId} is quit but quitAt not set`,
        context: "employee.quitAt"
      });
    }

    if (emp.status === EmployeeStatus.FIRED && !emp.firedAt) {
      warnings.push({
        severity: "warning",
        message: `Employee ${empId} is fired but firedAt not set`,
        context: "employee.firedAt"
      });
    }
  }

  // Check company state validity
  if (company) {
    if (company.money < 0) {
      warnings.push({
        severity: "warning",
        message: `Company has negative money: $${company.money}`,
        context: "company.money"
      });
    }

    if (company.reputation < 0 || company.reputation > 100) {
      warnings.push({
        severity: "warning",
        message: `Company has invalid reputation: ${company.reputation}`,
        context: "company.reputation"
      });
    }

    if (company.employeeIds.length > company.maxEmployees) {
      errors.push({
        severity: "error",
        message: `Company has ${company.employeeIds.length} employees but max is ${company.maxEmployees}`,
        context: "company.employeeIds"
      });
    }
  }

  // Check event references
  for (const eventId in state.gameEvents) {
    const event = state.gameEvents[eventId];

    if (event.entityType === "employee" && event.entityId && !state.employees[event.entityId]) {
      warnings.push({
        severity: "warning",
        message: `Event ${eventId} references employee ${event.entityId} but not found`,
        context: "event.entityId"
      });
    }

    if (event.entityType === "saga" && event.entityId && !state.sagas[event.entityId]) {
      warnings.push({
        severity: "warning",
        message: `Event ${eventId} references saga ${event.entityId} but not found`,
        context: "event.entityId"
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate saga state
 */
export function validateSaga(saga: any, state: NormalizedGameState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (saga.status === SagaStatus.IN_PROGRESS && !saga.startedAt) {
    errors.push({
      severity: "warning",
      message: `Saga ${saga.id} is in progress but startedAt not set`,
      context: "saga.startedAt"
    });
  }

  if (saga.status === SagaStatus.COMPLETED && !saga.completedAt) {
    errors.push({
      severity: "warning",
      message: `Saga ${saga.id} is completed but completedAt not set`,
      context: "saga.completedAt"
    });
  }

  return errors;
}

/**
 * Validate employee state
 */
export function validateEmployee(employee: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check skill ranges
  const skills = ["coding", "design", "leadership", "testing"];
  for (const skill of skills) {
    const value = employee[skill];
    if (value < 0 || value > 100) {
      errors.push({
        severity: "warning",
        message: `Employee ${employee.id} has invalid ${skill}: ${value}`,
        context: `employee.${skill}`
      });
    }
  }

  return errors;
}

/**
 * Print validation result to console
 */
export function printValidationResult(result: ValidationResult): void {
  if (result.valid) {
    console.log("%c✓ Game state is valid", "color: green; font-weight: bold;");
  } else {
    console.log("%c✗ Game state has errors", "color: red; font-weight: bold;");
  }

  if (result.errors.length > 0) {
    console.group("%cErrors (" + result.errors.length + ")", "color: red; font-weight: bold;");
    for (const error of result.errors) {
      console.log(`  ${error.message}`, error.context ? `(${error.context})` : "");
    }
    console.groupEnd();
  }

  if (result.warnings.length > 0) {
    console.group("%cWarnings (" + result.warnings.length + ")", "color: orange; font-weight: bold;");
    for (const warning of result.warnings) {
      console.log(`  ${warning.message}`, warning.context ? `(${warning.context})` : "");
    }
    console.groupEnd();
  }
}

export default {
  validateGameState,
  validateSaga,
  validateEmployee,
  printValidationResult
};
