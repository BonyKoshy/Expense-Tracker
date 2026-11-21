import type {
  Account,
  RecurringCommitment,
  Person,
  Transaction,
  AvailableToSpendBreakdown,
  AccountType,
} from '../types';
import type { FinanceTrackerDatabase } from '../db';
import { addMoney, subMoney, roundMoney } from '../utils/money';

/**
 * Calculates the "Available to Spend" financial intelligence metric:
 *
 * FORMULA:
 * Available to Spend = Primary Bank Balance - Total Credit Card Liability - Primary Bank Reserved Commitments
 *
 * CRITICAL ACCOUNTING RULE:
 * Uncollected receivables (money friends owe to the user) are NEVER added to available cash,
 * preventing a false sense of liquidity before money actually lands in the bank.
 */
export function calculateAvailableToSpend(
  accounts: Account[],
  recurringCommitments: RecurringCommitment[],
  people: Person[]
): AvailableToSpendBreakdown {
  // 1. Identify key individual accounts
  const hdfcAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      acc.type === 'bank' &&
      acc.name.toLowerCase().includes('hdfc')
  );
  const defaultBank = accounts.find(
    (acc) =>
      !acc.isArchived &&
      acc.isDefault &&
      (acc.type === 'bank' || acc.type === 'wallet')
  );
  const firstBank = accounts.find(
    (acc) => !acc.isArchived && acc.type === 'bank'
  );

  const primaryBankAcc =
    hdfcAcc ||
    defaultBank ||
    firstBank ||
    accounts.find((a) => !a.isArchived && a.type !== 'credit_card') ||
    accounts[0];

  const primaryBankName = primaryBankAcc ? primaryBankAcc.name : 'Primary Bank';
  const hdfcBalance = primaryBankAcc ? roundMoney(primaryBankAcc.balance || 0) : 0;

  const canaraAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      acc.name.toLowerCase().includes('canara')
  );
  const canaraBalance = canaraAcc ? roundMoney(canaraAcc.balance || 0) : 0;

  const amazonWallet = accounts.find(
    (acc) =>
      !acc.isArchived &&
      (acc.type === 'wallet' || acc.name.toLowerCase().includes('amazon'))
  );
  const amazonWalletBalance = amazonWallet ? roundMoney(amazonWallet.balance || 0) : 0;

  const cashAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      (acc.type === 'cash' || acc.name.toLowerCase().includes('cash'))
  );
  const cashBalance = cashAcc ? roundMoney(cashAcc.balance || 0) : 0;

  // 2. Net Money Owned: Daily operational liquid buffer
  // If HDFC salary exists, operational liquidity is Primary Bank + Wallets + Cash.
  // Otherwise, sums all active liquid asset accounts.
  const netMoneyOwned = hdfcAcc
    ? addMoney(hdfcBalance, addMoney(amazonWalletBalance, cashBalance))
    : roundMoney(
        accounts
          .filter(
            (acc) =>
              !acc.isArchived &&
              (acc.type === 'bank' || acc.type === 'cash' || acc.type === 'wallet')
          )
          .reduce((sum, acc) => addMoney(sum, acc.balance || 0), 0)
      );

  // 3. Total Liquid Balances: All active bank accounts + Cash + Wallets
  const totalLiquidBalances = roundMoney(
    accounts
      .filter(
        (acc) =>
          !acc.isArchived &&
          (acc.type === 'bank' || acc.type === 'cash' || acc.type === 'wallet')
      )
      .reduce((sum, acc) => addMoney(sum, acc.balance || 0), 0)
  );

  // 4. Active investments (e.g. ICCSL RD, Mutual Funds)
  const totalInvestments = roundMoney(
    accounts
      .filter((acc) => !acc.isArchived && acc.type === 'investment')
      .reduce((sum, acc) => addMoney(sum, acc.balance || 0), 0)
  );

  // 5. Total Accumulated Savings: Canara Bank + RD investments
  const savingsBalance = addMoney(canaraBalance, totalInvestments);

  // 6. Reserved Commitments (Primary Bank vs Total)
  const totalReservedCommitments = roundMoney(
    recurringCommitments
      .filter((comm) => comm.isActive && comm.isReservedCommitment)
      .reduce((sum, comm) => addMoney(sum, comm.amount || 0), 0)
  );

  const hdfcReservedCommitments = roundMoney(
    recurringCommitments
      .filter(
        (comm) =>
          comm.isActive &&
          comm.isReservedCommitment &&
          (comm.accountId === primaryBankAcc?.id ||
            !comm.accountId ||
            (hdfcAcc && comm.accountId.includes('hdfc')))
      )
      .reduce((sum, comm) => addMoney(sum, comm.amount || 0), 0)
  );

  // 7. Unbilled Credit Card Liability across ALL active credit cards
  const unbilledCCLiability = roundMoney(
    accounts
      .filter((acc) => !acc.isArchived && acc.type === 'credit_card')
      .reduce((sum, acc) => addMoney(sum, Math.max(0, acc.balance || 0)), 0)
  );

  // 8. Shared Group & Friend Balances (Lent vs Borrowed):
  let totalReceivables = 0;
  let totalPayables = 0;

  for (const person of people) {
    const netBal = roundMoney(person.netBalance || 0);
    if (netBal > 0) {
      totalReceivables = addMoney(totalReceivables, netBal);
    } else if (netBal < 0) {
      totalPayables = addMoney(totalPayables, Math.abs(netBal));
    }
  }

  // Lent: Total amount friends owe user (receivables)
  const lent = roundMoney(totalReceivables);

  // Net Money Owed to Others: If payables exceed receivables, reserve the deficit
  const netMoneyOwedToOthers = Math.max(0, subMoney(totalPayables, totalReceivables));

  // 9. Available to Spend: Primary Bank balance - CC Liability - Reserved commitments
  const availableToSpend = subMoney(
    subMoney(hdfcBalance, unbilledCCLiability),
    hdfcReservedCommitments
  );

  // 10. Total Net Worth:
  // Liquid Balances + Investments + Receivables - (CC Liability + Payables)
  const totalAssets = addMoney(addMoney(totalLiquidBalances, totalInvestments), totalReceivables);
  const totalLiabilities = addMoney(unbilledCCLiability, totalPayables);
  const totalNetWorth = subMoney(totalAssets, totalLiabilities);

  return {
    totalLiquidBalances,
    reservedCommitments: totalReservedCommitments,
    hdfcReservedCommitments,
    unbilledCCLiability,
    totalReceivables,
    totalPayables,
    netMoneyOwedToOthers,
    availableToSpend,
    totalNetWorth,
    netMoneyOwned,
    lent,
    savingsBalance,
    hdfcBalance,
    primaryBankName,
    canaraBalance,
    amazonWalletBalance,
    cashBalance,
    totalInvestments,
  };
}

export interface BalanceDeltas {
  accountDeltas: Map<string, number>; // accountId -> cashflow delta (+ means inflow, - means outflow)
  peopleDeltas: Map<string, number>;  // personId -> netBalance delta (+ means they owe me more, - means they owe me less)
}

/**
 * Standardized helper: Applies cashflow delta to an account balance.
 *
 * STANDARDIZED SIGN CONVENTIONS:
 * 1. Asset Accounts (Bank, Cash, Wallet, Investment):
 *    - Balance represents asset value (>= 0).
 *    - Inflow (+delta) increases balance.
 *    - Outflow (-delta) decreases balance.
 *    newBalance = currentBalance + delta.
 *
 * 2. Credit Card (Liability):
 *    - Balance represents outstanding debt/liability (>= 0).
 *    - Spending (cash outflow: -amount) INCREASES liability (+amount).
 *    - Bill payment or refund (cash inflow: +amount) DECREASES liability (-amount).
 *    newBalance = currentBalance - delta.
 */
export function applyAccountBalanceDelta(
  currentBalance: number,
  cashflowDelta: number,
  accountType: AccountType
): number {
  if (accountType === 'credit_card') {
    return subMoney(currentBalance, cashflowDelta);
  }
  return addMoney(currentBalance, cashflowDelta);
}

/**
 * Standardized helper: Inverts/reverts a previously applied cashflow delta.
 */
export function revertAccountBalanceDelta(
  currentBalance: number,
  cashflowDelta: number,
  accountType: AccountType
): number {
  if (accountType === 'credit_card') {
    return addMoney(currentBalance, cashflowDelta);
  }
  return subMoney(currentBalance, cashflowDelta);
}

/**
 * Computes exact cashflow deltas for Accounts and People from a transaction.
 */
export function calculateTransactionDeltas(tx: Transaction): BalanceDeltas {
  const accountDeltas = new Map<string, number>();
  const peopleDeltas = new Map<string, number>();

  const adjustAccount = (accId: string | undefined, delta: number) => {
    if (!accId) return;
    const current = accountDeltas.get(accId) || 0;
    accountDeltas.set(accId, addMoney(current, delta));
  };

  const adjustPerson = (pId: string | undefined, delta: number) => {
    if (!pId || pId === 'user') return;
    const current = peopleDeltas.get(pId) || 0;
    peopleDeltas.set(pId, addMoney(current, delta));
  };

  const amount = roundMoney(tx.amount || 0);

  switch (tx.type) {
    case 'expense': {
      // Outflow from paying account
      adjustAccount(tx.accountId, -amount);
      break;
    }

    case 'income': {
      // Inflow to receiving account
      adjustAccount(tx.accountId, amount);
      break;
    }

    case 'transfer': {
      // Outflow from source, inflow to destination
      adjustAccount(tx.accountId, -amount);
      if (tx.toAccountId) {
        adjustAccount(tx.toAccountId, amount);
      }
      break;
    }

    case 'credit_card_payment': {
      // Paid from bank account (outflow: -amount), deposited to CC (inflow: +amount)
      adjustAccount(tx.accountId, -amount);
      if (tx.toAccountId) {
        adjustAccount(tx.toAccountId, amount);
      }
      break;
    }

    case 'settlement_received': {
      // Friend paid user: Liquid balance increases (+amount), friend's receivable decreases (-amount)
      // ZERO PERSONAL INCOME OR EXPENSE RECORDED
      adjustAccount(tx.accountId, amount);
      const payerId =
        tx.paidByPersonId && tx.paidByPersonId !== 'user'
          ? tx.paidByPersonId
          : tx.splits?.[0]?.personId;
      adjustPerson(payerId, -amount);
      break;
    }

    case 'settlement_paid': {
      // User paid friend: Liquid balance decreases (-amount), user's payable debt decreases (+amount toward 0)
      // ZERO PERSONAL INCOME OR EXPENSE RECORDED
      adjustAccount(tx.accountId, -amount);
      const payeeId = tx.splits?.[0]?.personId || tx.paidByPersonId;
      adjustPerson(payeeId, amount);
      break;
    }

    case 'shared_expense': {
      if (tx.paidByPersonId === 'user') {
        // User paid the entire bill:
        // 1. Account is charged full amount
        adjustAccount(tx.accountId, -amount);

        // 2. Each friend owes their split share (increases receivable: +split.amount)
        if (Array.isArray(tx.splits)) {
          for (const split of tx.splits) {
            if (split.personId && split.personId !== 'user') {
              adjustPerson(split.personId, roundMoney(split.amount || 0));
            }
          }
        }
      } else {
        // Friend paid the entire bill on user's behalf:
        // User's bank account was NOT charged!
        // User owes the payer their personal share: payer's netBalance decreases by user's personal share
        const personalShare = roundMoney(tx.personalExpenseAmount || 0);
        adjustPerson(tx.paidByPersonId, -personalShare);
      }
      break;
    }
  }

  return { accountDeltas, peopleDeltas };
}

/**
 * Atomically records a transaction and applies resulting balance updates in Dexie.js.
 */
export async function recordTransaction(
  database: FinanceTrackerDatabase,
  transaction: Transaction
): Promise<void> {
  const { accountDeltas, peopleDeltas } = calculateTransactionDeltas(transaction);

  await database.transaction(
    'rw',
    [database.transactions, database.accounts, database.people],
    async () => {
      // 1. Insert transaction
      await database.transactions.add(transaction);

      // 2. Apply account balance updates
      for (const [accountId, delta] of accountDeltas.entries()) {
        const acc = await database.accounts.get(accountId);
        if (acc) {
          const newBalance = applyAccountBalanceDelta(acc.balance || 0, delta, acc.type);
          await database.accounts.update(accountId, {
            balance: newBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Apply people netBalance updates
      for (const [personId, delta] of peopleDeltas.entries()) {
        const person = await database.people.get(personId);
        if (person) {
          const newNetBalance = addMoney(person.netBalance || 0, delta);
          await database.people.update(personId, {
            netBalance: newNetBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );
}

/**
 * Atomically deletes a transaction and inverts its balance updates from accounts and people.
 */
export async function deleteTransaction(
  database: FinanceTrackerDatabase,
  transactionId: string
): Promise<void> {
  const transaction = await database.transactions.get(transactionId);
  if (!transaction) return;

  const { accountDeltas, peopleDeltas } = calculateTransactionDeltas(transaction);

  await database.transaction(
    'rw',
    [database.transactions, database.accounts, database.people],
    async () => {
      // 1. Delete transaction
      await database.transactions.delete(transactionId);

      // 2. Revert account balances
      for (const [accountId, delta] of accountDeltas.entries()) {
        const acc = await database.accounts.get(accountId);
        if (acc) {
          const newBalance = revertAccountBalanceDelta(acc.balance || 0, delta, acc.type);
          await database.accounts.update(accountId, {
            balance: newBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Revert people net balances
      for (const [personId, delta] of peopleDeltas.entries()) {
        const person = await database.people.get(personId);
        if (person) {
          const newNetBalance = subMoney(person.netBalance || 0, delta);
          await database.people.update(personId, {
            netBalance: newNetBalance,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );
}

/**
 * Atomically updates an existing transaction by reverting its old deltas
 * and applying the updated transaction's deltas in a single database transaction.
 */
export async function updateTransaction(
  database: FinanceTrackerDatabase,
  oldTransaction: Transaction,
  newTransaction: Transaction
): Promise<void> {
  const oldDeltas = calculateTransactionDeltas(oldTransaction);
  const newDeltas = calculateTransactionDeltas(newTransaction);

  // Gather all impacted account IDs
  const allAccountIds = new Set<string>([
    ...oldDeltas.accountDeltas.keys(),
    ...newDeltas.accountDeltas.keys(),
  ]);

  // Gather all impacted person IDs
  const allPersonIds = new Set<string>([
    ...oldDeltas.peopleDeltas.keys(),
    ...newDeltas.peopleDeltas.keys(),
  ]);

  await database.transaction(
    'rw',
    [database.transactions, database.accounts, database.people],
    async () => {
      // 1. Put updated transaction
      await database.transactions.put(newTransaction);

      // 2. Reconcile account balances: revert old delta, apply new delta
      for (const accountId of allAccountIds) {
        const acc = await database.accounts.get(accountId);
        if (acc) {
          const oldDelta = oldDeltas.accountDeltas.get(accountId) || 0;
          const newDelta = newDeltas.accountDeltas.get(accountId) || 0;

          // Revert old, then apply new
          let bal = revertAccountBalanceDelta(acc.balance || 0, oldDelta, acc.type);
          bal = applyAccountBalanceDelta(bal, newDelta, acc.type);

          await database.accounts.update(accountId, {
            balance: bal,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Reconcile people net balances
      for (const personId of allPersonIds) {
        const person = await database.people.get(personId);
        if (person) {
          const oldDelta = oldDeltas.peopleDeltas.get(personId) || 0;
          const newDelta = newDeltas.peopleDeltas.get(personId) || 0;

          const bal = addMoney(subMoney(person.netBalance || 0, oldDelta), newDelta);

          await database.people.update(personId, {
            netBalance: bal,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );
}

/**
 * Reconciliation Engine:
 * Recomputes all account balances and people net balances from historical transactions.
 * Prevents silent drift caused by crashes, manual edits, or interrupted imports.
 */
export async function reconcileAllBalances(
  database: FinanceTrackerDatabase
): Promise<{
  accountsReconciled: number;
  peopleReconciled: number;
  discrepanciesFound: number;
}> {
  const [allAccounts, allPeople, allTransactions] = await Promise.all([
    database.accounts.toArray(),
    database.people.toArray(),
    database.transactions.orderBy('date').toArray(),
  ]);

  // Start with 0 deltas
  const expectedAccountDeltas = new Map<string, number>();
  const expectedPeopleDeltas = new Map<string, number>();

  for (const tx of allTransactions) {
    const { accountDeltas, peopleDeltas } = calculateTransactionDeltas(tx);
    for (const [accId, delta] of accountDeltas.entries()) {
      expectedAccountDeltas.set(accId, addMoney(expectedAccountDeltas.get(accId) || 0, delta));
    }
    for (const [pId, delta] of peopleDeltas.entries()) {
      expectedPeopleDeltas.set(pId, addMoney(expectedPeopleDeltas.get(pId) || 0, delta));
    }
  }

  let discrepanciesFound = 0;
  let accountsReconciled = 0;
  let peopleReconciled = 0;

  await database.transaction(
    'rw',
    [database.accounts, database.people],
    async () => {
      // 1. Reconcile people: base is 0 + sum of all transaction deltas
      for (const person of allPeople) {
        const expected = expectedPeopleDeltas.get(person.id) || 0;
        const current = roundMoney(person.netBalance || 0);
        if (Math.abs(expected - current) > 0.001) {
          discrepanciesFound++;
          await database.people.update(person.id, {
            netBalance: expected,
            updatedAt: new Date().toISOString(),
          });
          peopleReconciled++;
        }
      }

      // 2. Reconcile accounts if transactions exist
      // Note: If an account has no starting transaction, delta represents net activity
      for (const acc of allAccounts) {
        if (expectedAccountDeltas.has(acc.id)) {
          // Account activity was recorded
          const delta = expectedAccountDeltas.get(acc.id) || 0;
          const expected = applyAccountBalanceDelta(0, delta, acc.type);
          const current = roundMoney(acc.balance || 0);

          // Only auto-correct if discrepancy is found and transactions are known
          if (allTransactions.length > 0 && Math.abs(expected - current) > 0.001) {
            discrepanciesFound++;
            await database.accounts.update(acc.id, {
              balance: expected,
              updatedAt: new Date().toISOString(),
            });
            accountsReconciled++;
          }
        }
      }
    }
  );

  return { accountsReconciled, peopleReconciled, discrepanciesFound };
}
