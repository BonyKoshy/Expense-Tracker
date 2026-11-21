import { describe, it, expect } from 'vitest';
import {
  applyAccountBalanceDelta,
  revertAccountBalanceDelta,
  calculateAvailableToSpend,
} from './accountingEngine';
import type { Account, RecurringCommitment, Person } from '../types';

describe('Accounting Engine Core Math & Invariants (accountingEngine.ts)', () => {
  const bankAccount: Account = {
    id: 'acc_bank',
    name: 'HDFC Bank',
    type: 'bank',
    balance: 5000,
    currency: 'INR',
    color: '#1a2536',
    icon: 'landmark',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const creditCardAccount: Account = {
    id: 'acc_cc',
    name: 'HDFC Credit Card',
    type: 'credit_card',
    balance: 1500, // ₹1500 current liability
    creditLimit: 50000,
    currency: 'INR',
    color: '#1a2536',
    icon: 'credit_card',
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('updates asset account balances correctly with positive and negative cashflow', () => {
    // Spending ₹500 from bank -> cashflow delta -500 -> balance becomes 4500
    const afterSpend = applyAccountBalanceDelta(bankAccount.balance, -500, bankAccount.type);
    expect(afterSpend).toBe(4500);

    // Reverting spend -> cashflow delta -500 -> balance restored to 5000
    const afterRevertSpend = revertAccountBalanceDelta(afterSpend, -500, bankAccount.type);
    expect(afterRevertSpend).toBe(5000);

    // Receiving ₹200 income/settlement into bank -> cashflow delta +200 -> balance becomes 5200
    const afterIncome = applyAccountBalanceDelta(bankAccount.balance, 200, bankAccount.type);
    expect(afterIncome).toBe(5200);
  });

  it('maintains positive liability sign convention on credit cards', () => {
    // CC balance represents outstanding debt (liability >= 0)
    // Spending ₹1000 on CC -> cashflow delta is -1000 -> liability increases from 1500 to 2500
    const afterSpend = applyAccountBalanceDelta(creditCardAccount.balance, -1000, creditCardAccount.type);
    expect(afterSpend).toBe(2500);

    // Paying ₹1500 CC bill from bank -> cashflow delta is +1500 on CC -> liability decreases to 0
    const afterBillPay = applyAccountBalanceDelta(creditCardAccount.balance, 1500, creditCardAccount.type);
    expect(afterBillPay).toBe(0);

    // Reverting CC spend (-1000) reduces liability back to 1500
    const afterRevert = revertAccountBalanceDelta(2500, -1000, creditCardAccount.type);
    expect(afterRevert).toBe(1500);
  });

  it('calculates Available to Spend accurately using formula: Primary Bank - CC Debt - Commitments', () => {
    const accounts: Account[] = [
      {
        id: 'acc_hdfc_salary',
        name: 'HDFC Bank Salary',
        type: 'bank',
        balance: 10000,
        currency: 'INR',
        color: '#1a2536',
        icon: 'landmark',
        isArchived: false,
        isDefault: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'acc_cc',
        name: 'Credit Card',
        type: 'credit_card',
        balance: 3000, // 3000 liability
        currency: 'INR',
        color: '#1a2536',
        icon: 'credit_card',
        isArchived: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'acc_cash',
        name: 'Cash',
        type: 'cash',
        balance: 1000,
        currency: 'INR',
        color: '#1a2536',
        icon: 'banknote',
        isArchived: false,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'acc_savings',
        name: 'Canara Savings',
        type: 'bank',
        balance: 50000,
        currency: 'INR',
        color: '#1a2536',
        icon: 'landmark',
        isArchived: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const recurring: RecurringCommitment[] = [
      {
        id: 'rec_1',
        name: 'PG Rent',
        amount: 4000,
        accountId: 'acc_hdfc_salary',
        categoryId: 'cat_rent',
        type: 'recurring_expense',
        frequency: 'monthly',
        dayOfMonth: 5,
        startDate: '2024-01-01',
        isActive: true,
        isReservedCommitment: true,
        paidInstallments: 0,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const people: Person[] = [
      {
        id: 'p_1',
        name: 'Sreerag',
        netBalance: 500, // Owes me 500
        createdAt: '',
        updatedAt: '',
      },
    ];

    const breakdown = calculateAvailableToSpend(accounts, recurring, people);

    // Primary Bank (10,000) - CC Liability (3,000) - Reserved Commitments (4,000) = 3,000
    expect(breakdown.availableToSpend).toBe(3000);
    expect(breakdown.hdfcBalance).toBe(10000);
    expect(breakdown.unbilledCCLiability).toBe(3000);
    expect(breakdown.hdfcReservedCommitments).toBe(4000);
    expect(breakdown.lent).toBe(500);
    // Net Money Owned: 10,000 + 1,000 = 11,000
    expect(breakdown.netMoneyOwned).toBe(11000);
    // Total Net Worth: Assets (10000 + 1000 + 50000 = 61000) + Lent (500) - CC (3000) = 58500
    expect(breakdown.totalNetWorth).toBe(58500);
  });
});
