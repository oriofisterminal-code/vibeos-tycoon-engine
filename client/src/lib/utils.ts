import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// GAME LOGIC UTILITIES
// ============================================================================

/**
 * Clamp a value between min and max
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate productivity based on stress and morale
 * Stress reduces productivity (70% weight), morale boosts it (30% weight)
 * Result is normalized to 0-100 range
 * 
 * @param stress - Employee stress level (0-100)
 * @param morale - Employee morale level (0-100)
 * @returns Productivity percentage (0-100)
 */
export function calculateProductivity(stress: number, morale: number): number {
  const stressImpact = (100 - stress) * 0.7;  // 0-70
  const moraleBoost = (morale / 100) * 30;    // 0-30
  return clamp(stressImpact + moraleBoost, 0, 100);
}

/**
 * Validate AP allocation percentages
 * Total must be between 0 and 100
 * 
 * @param allocations - Array of {sagaId, percentage} pairs
 * @returns Validation result with error message if invalid
 */
export function validateAPAllocation(
  allocations: { sagaId: number; percentage: number }[]
): {
  valid: boolean;
  error?: string;
} {
  if (allocations.length === 0) {
    return { valid: false, error: "No allocations provided" };
  }

  const total = allocations.reduce((sum, a) => sum + a.percentage, 0);

  if (total === 0) {
    return { valid: false, error: "Total allocation percentage is 0%" };
  }

  if (total > 100) {
    return {
      valid: false,
      error: `Total allocation percentage ${total}% exceeds 100%`
    };
  }

  return { valid: true };
}

/**
 * Check if an employee should churn (quit)
 * Employees quit when morale drops below 30
 * 
 * @param morale - Employee morale level
 * @param status - Employee status
 * @returns True if employee should quit
 */
export function shouldEmployeeChurn(morale: number, status: string): boolean {
  return morale <= 30 && status === "active";
}

/**
 * Calculate salary cost for a period
 * @param dailySalary - Daily salary amount
 * @param daysInPeriod - Number of days (default 30 for monthly)
 * @returns Total salary cost
 */
export function calculateSalaryCost(dailySalary: number, daysInPeriod: number = 30): number {
  return Math.floor(dailySalary * daysInPeriod);
}

/**
 * Calculate reward multiplier based on company state
 * @param reputation - Company reputation (0-100)
 * @param techBonus - Tech stack bonus multiplier
 * @returns Reward multiplier
 */
export function calculateRewardMultiplier(reputation: number, techBonus: number = 1.0): number {
  const reputationMultiplier = 0.5 + (reputation / 100) * 1.5;
  return reputationMultiplier * techBonus;
}

/**
 * Format currency for display
 * @param amount - Amount in currency units
 * @returns Formatted string
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

/**
 * Format percentage for display
 * @param value - Value as decimal (0-1) or percentage (0-100)
 * @param isDecimal - If true, multiply by 100
 * @returns Formatted string
 */
export function formatPercentage(value: number, isDecimal: boolean = true): string {
  const percent = isDecimal ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

/**
 * Get time elapsed since a timestamp
 * @param timestamp - Timestamp in milliseconds
 * @returns Human-readable time string
 */
export function getTimeElapsed(timestamp: number): string {
  const now = Date.now();
  const elapsed = now - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Check if value is within range
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
