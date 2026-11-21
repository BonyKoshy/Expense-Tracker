/**
 * Monetary Precision Utilities for FinTrack
 * 
 * In financial systems, IEEE 754 double-precision floating point arithmetic
 * (e.g. 0.1 + 0.2 = 0.30000000000000004) can introduce compounding rounding errors.
 * 
 * FinTrack adopts an exact integer-paise calculation strategy:
 * 1 INR = 100 paise.
 * All monetary allocations, splits, and deltas are reconciled at the paise level,
 * guaranteeing that no money is ever silently created or destroyed.
 */

/**
 * Converts Indian Rupees (INR) to integer paise.
 * Uses Math.round to safely convert floating point representations.
 */
export function toPaise(rupees: number): number {
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise back to Indian Rupees (INR) with 2 decimal places.
 */
export function toRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Rounds an INR number strictly to 2 decimal places.
 */
export function roundMoney(amount: number): number {
  return toRupees(toPaise(amount));
}

/**
 * Adds two monetary amounts with zero floating point drift.
 */
export function addMoney(a: number, b: number): number {
  return toRupees(toPaise(a) + toPaise(b));
}

/**
 * Subtracts monetary amount b from a with zero floating point drift.
 */
export function subMoney(a: number, b: number): number {
  return toRupees(toPaise(a) - toPaise(b));
}

/**
 * Multiplies a monetary amount by a scalar factor and rounds to nearest paisa.
 */
export function multiplyMoney(amount: number, factor: number): number {
  return toRupees(Math.round(toPaise(amount) * factor));
}

export interface SplitAllocation {
  participantId: string;
  amount: number; // In Rupees
}

/**
 * Deterministically allocates an exact monetary bill among N participants equally.
 * Any remainder paise (e.g. ₹10.00 / 3 = ₹3.33 + ₹3.33 + ₹3.34) are distributed
 * to the first R participants in order, ensuring that:
 * sum(allocations) === totalAmount exactly.
 */
export function allocateEqualSplit(
  totalRupees: number,
  participantIds: string[]
): SplitAllocation[] {
  const count = participantIds.length;
  if (count === 0) return [];
  if (count === 1) return [{ participantId: participantIds[0], amount: roundMoney(totalRupees) }];

  const totalPaise = toPaise(totalRupees);
  const baseSharePaise = Math.floor(totalPaise / count);
  let remainderPaise = totalPaise - baseSharePaise * count;

  return participantIds.map((id) => {
    let sharePaise = baseSharePaise;
    if (remainderPaise > 0) {
      sharePaise += 1;
      remainderPaise -= 1;
    } else if (remainderPaise < 0) {
      sharePaise -= 1;
      remainderPaise += 1;
    }
    return {
      participantId: id,
      amount: toRupees(sharePaise),
    };
  });
}

/**
 * Validates whether an array of split allocations reconciles exactly with the total amount.
 */
export function validateSplitReconciliation(
  totalRupees: number,
  splits: { amount: number }[]
): { isValid: boolean; difference: number } {
  const totalPaise = toPaise(totalRupees);
  const splitsPaise = splits.reduce((sum, s) => sum + toPaise(s.amount), 0);
  const diffPaise = totalPaise - splitsPaise;
  return {
    isValid: diffPaise === 0,
    difference: toRupees(diffPaise),
  };
}
