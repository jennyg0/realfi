// DCA (Dollar Cost Averaging) helper functions

/**
 * Calculate the next execution time based on current time and frequency
 */
export function calculateNextExecution(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      throw new Error(`Invalid frequency: ${frequency}`);
  }

  return next;
}

/**
 * Check if a DCA schedule should be executed now
 */
export function shouldExecuteDCA(
  nextExecutionAt: Date,
  endDate: Date | null,
  isActive: boolean
): boolean {
  const now = new Date();

  // Check if active
  if (!isActive) return false;

  // Check if past end date
  if (endDate && now > endDate) return false;

  // Check if it's time to execute
  return now >= nextExecutionAt;
}

/**
 * Calculate total invested and projected returns for a DCA schedule
 */
export function calculateDCAProjections(
  amountPerDeposit: number,
  frequency: string,
  apy: number,
  durationMonths: number = 12
): {
  totalInvested: number;
  projectedValue: number;
  numberOfDeposits: number;
} {
  // Calculate number of deposits based on frequency
  let depositsPerYear = 0;
  switch (frequency) {
    case 'daily':
      depositsPerYear = 365;
      break;
    case 'weekly':
      depositsPerYear = 52;
      break;
    case 'biweekly':
      depositsPerYear = 26;
      break;
    case 'monthly':
      depositsPerYear = 12;
      break;
  }

  const numberOfDeposits = Math.floor((depositsPerYear * durationMonths) / 12);
  const totalInvested = amountPerDeposit * numberOfDeposits;

  // Simple compound interest calculation
  // This is a simplified model - real DCA returns will vary
  const periodicRate = apy / depositsPerYear;
  let projectedValue = 0;

  // Calculate future value with regular deposits
  for (let i = 0; i < numberOfDeposits; i++) {
    const periodsRemaining = numberOfDeposits - i;
    projectedValue += amountPerDeposit * Math.pow(1 + periodicRate, periodsRemaining);
  }

  return {
    totalInvested,
    projectedValue,
    numberOfDeposits,
  };
}
