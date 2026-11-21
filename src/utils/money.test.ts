import { describe, it, expect } from 'vitest';
import {
  toPaise,
  toRupees,
  roundMoney,
  addMoney,
  subMoney,
  multiplyMoney,
  allocateEqualSplit,
  validateSplitReconciliation,
} from './money';

describe('Monetary Precision Engine (money.ts)', () => {
  it('converts between rupees and paise accurately', () => {
    expect(toPaise(0)).toBe(0);
    expect(toPaise(10.5)).toBe(1050);
    expect(toPaise(100.99)).toBe(10099);
    expect(toPaise(0.1 + 0.2)).toBe(30);

    expect(toRupees(1050)).toBe(10.5);
    expect(toRupees(10099)).toBe(100.99);
    expect(toRupees(30)).toBe(0.3);
  });

  it('eliminates floating point arithmetic errors', () => {
    // Standard JS: 0.1 + 0.2 === 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);
    // money.ts: exact
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(subMoney(0.3, 0.2)).toBe(0.1);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('handles multiplication with precise rounding', () => {
    expect(multiplyMoney(10.25, 3)).toBe(30.75);
    expect(multiplyMoney(33.3333, 1)).toBe(33.33);
  });

  it('allocates equal splits deterministically distributing remainder paise', () => {
    // ₹100 split 3 ways -> 33.34, 33.33, 33.33 (sum is exactly 100.00)
    const allocations3 = allocateEqualSplit(100, ['p1', 'p2', 'p3']);
    const amounts3 = allocations3.map((a) => a.amount);
    expect(amounts3).toEqual([33.34, 33.33, 33.33]);
    const sum3 = amounts3.reduce((acc, v) => addMoney(acc, v), 0);
    expect(sum3).toBe(100);

    // ₹10 split 4 ways -> 2.50 each
    const allocations4 = allocateEqualSplit(10, ['p1', 'p2', 'p3', 'p4']);
    const amounts4 = allocations4.map((a) => a.amount);
    expect(amounts4).toEqual([2.5, 2.5, 2.5, 2.5]);
    const sum4 = amounts4.reduce((acc, v) => addMoney(acc, v), 0);
    expect(sum4).toBe(10);

    // ₹1 split 3 ways -> 0.34, 0.33, 0.33
    const allocations1 = allocateEqualSplit(1, ['p1', 'p2', 'p3']);
    const amounts1 = allocations1.map((a) => a.amount);
    expect(amounts1).toEqual([0.34, 0.33, 0.33]);
    expect(amounts1.reduce((acc, v) => addMoney(acc, v), 0)).toBe(1);
  });

  it('validates split reconciliation against total bill amount', () => {
    const valid = validateSplitReconciliation(100, [
      { amount: 33.34 },
      { amount: 33.33 },
      { amount: 33.33 },
    ]);
    expect(valid.isValid).toBe(true);
    expect(valid.difference).toBe(0);

    const invalid = validateSplitReconciliation(100, [
      { amount: 33.33 },
      { amount: 33.33 },
    ]);
    expect(invalid.isValid).toBe(false);
    expect(invalid.difference).toBe(33.34);
  });
});
