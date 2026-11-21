import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  calculateAvailableToSpend,
  recordTransaction,
  deleteTransaction,
} from '../services/accountingEngine';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '../types';

const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_SUBCATEGORIES: Subcategory[] = [];
const EMPTY_PEOPLE: Person[] = [];
const EMPTY_GROUPS: Group[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_RECURRING: RecurringCommitment[] = [];

export function useFinanceData() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? EMPTY_ACCOUNTS;
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? EMPTY_CATEGORIES;
  const subcategories = useLiveQuery(() => db.subcategories.toArray(), []) ?? EMPTY_SUBCATEGORIES;
  const people = useLiveQuery(() => db.people.toArray(), []) ?? EMPTY_PEOPLE;
  const groups = useLiveQuery(() => db.groups.toArray(), []) ?? EMPTY_GROUPS;
  const transactions =
    useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ??
    EMPTY_TRANSACTIONS;
  const recurringCommitments =
    useLiveQuery(() => db.recurringCommitments.toArray(), []) ?? EMPTY_RECURRING;

  const breakdown = useMemo(() => {
    return calculateAvailableToSpend(accounts, recurringCommitments, people, transactions);
  }, [accounts, recurringCommitments, people, transactions]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todaysTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.slice(0, 10) === todayStr);
  }, [transactions, todayStr]);

  const dueCommitments = useMemo(() => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return recurringCommitments.filter((comm) => {
      if (!comm.isActive) return false;
      const alreadyPaid = transactions.some(
        (tx) =>
          tx.recurringCommitmentId === comm.id &&
          tx.date.slice(0, 7) === currentMonthKey
      );
      return !alreadyPaid;
    });
  }, [recurringCommitments, transactions]);

  const confirmRecurringCommitment = async (comm: RecurringCommitment) => {
    const isRD = comm.type === 'recurring_investment';
    const tx: Transaction = {
      id: `tx_rec_${Date.now()}`,
      type: isRD ? 'transfer' : 'expense',
      title: comm.name,
      date: new Date().toISOString(),
      amount: comm.amount,
      accountId: comm.accountId,
      toAccountId: isRD ? 'acc_iccsl_rd' : undefined,
      categoryId: comm.categoryId,
      subcategoryId: comm.subcategoryId,
      personalExpenseAmount: isRD ? 0 : comm.amount,
      isShared: false,
      paidByPersonId: 'user',
      splits: [{ personId: 'user', amount: comm.amount, isSettled: true }],
      notes: `Confirmed monthly commitment: ${comm.name}`,
      recurringCommitmentId: comm.id,
      isRecurring: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await recordTransaction(db, tx);

    const nextPaid = comm.paidInstallments + 1;
    const nextRemaining = comm.remainingAmount
      ? Math.max(0, comm.remainingAmount - comm.amount)
      : undefined;

    await db.recurringCommitments.update(comm.id, {
      paidInstallments: nextPaid,
      remainingAmount: nextRemaining,
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteTransactionWithRevert = async (txId: string) => {
    await deleteTransaction(db, txId);
  };

  const simulateFriendSettlement = async (
    personId: string,
    personName: string,
    amount: number
  ) => {
    if (amount <= 0) return;

    const settlementTx: Transaction = {
      id: `tx_settle_${Date.now()}`,
      type: 'settlement_received',
      title: `${personName} GPay Settlement`,
      date: new Date().toISOString(),
      amount: amount,
      accountId: 'acc_hdfc_salary',
      personalExpenseAmount: 0,
      isShared: false,
      groupId: 'group_514',
      paidByPersonId: personId,
      splits: [{ personId: personId, amount: amount, isSettled: true }],
      notes: `Simulated settlement received from ${personName} via GPay UPI into HDFC Salary account.`,
      tags: ['gpay', 'settlement', 'pg-split'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await recordTransaction(db, settlementTx);
  };

  return {
    accounts,
    categories,
    subcategories,
    people,
    groups,
    transactions,
    recurringCommitments,
    breakdown,
    todayStr,
    todaysTransactions,
    dueCommitments,
    confirmRecurringCommitment,
    deleteTransactionWithRevert,
    simulateFriendSettlement,
  };
}
