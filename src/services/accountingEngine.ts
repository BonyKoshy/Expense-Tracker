import type {
  Account,
  RecurringCommitment,
  Person,
  Transaction,
  AvailableToSpendBreakdown,
} from '@/types';
import type { FinanceTrackerDatabase } from '@/db';

/**
 * Calculates the "Available to Spend" financial intelligence metric:
 * Formula (User Rule):
 * Available to Spend = HDFC Bank Balance - Credit Card Liability - Reserved Commitments (from HDFC)
 * "and also dont add money until i dont have it" (receivables are not added to available cash)
 */
export function calculateAvailableToSpend(
  accounts: Account[],
  recurringCommitments: RecurringCommitment[],
  people: Person[]
): AvailableToSpendBreakdown {
  // 1. Identify key individual accounts (HDFC or user's default/primary bank)
  const hdfcAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      acc.type === 'bank' &&
      acc.name.toLowerCase().includes('hdfc')
  );
  const defaultBank = accounts.find(
    (acc) => !acc.isArchived && acc.isDefault && (acc.type === 'bank' || acc.type === 'wallet')
  );
  const firstBank = accounts.find(
    (acc) => !acc.isArchived && acc.type === 'bank'
  );

  const primaryBankAcc = hdfcAcc || defaultBank || firstBank || accounts.find((a) => !a.isArchived) || accounts[0];
  const primaryBankName = primaryBankAcc ? primaryBankAcc.name : 'Primary Bank';
  const hdfcBalance = primaryBankAcc ? (primaryBankAcc.balance || 0) : 0;

  const canaraAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      acc.name.toLowerCase().includes('canara')
  );
  const canaraBalance = canaraAcc?.balance || 0;

  const amazonWallet = accounts.find(
    (acc) =>
      !acc.isArchived &&
      (acc.type === 'wallet' || acc.name.toLowerCase().includes('amazon'))
  );
  const amazonWalletBalance = amazonWallet?.balance || 0;

  const cashAcc = accounts.find(
    (acc) =>
      !acc.isArchived &&
      (acc.type === 'cash' || acc.name.toLowerCase().includes('cash'))
  );
  const cashBalance = cashAcc?.balance || 0;

  // 2. Net Money Owned: Entire balance of Primary Bank + Wallets + Cash
  const netMoneyOwned = hdfcAcc
    ? Math.round((hdfcBalance + amazonWalletBalance + cashBalance) * 100) / 100
    : Math.round(
        accounts
          .filter((acc) => !acc.isArchived && (acc.type === 'bank' || acc.type === 'cash' || acc.type === 'wallet'))
          .reduce((sum, acc) => sum + (acc.balance || 0), 0) * 100
      ) / 100;

  // 3. Total Liquid Balances: All bank accounts + Cash + Wallets
  const totalLiquidBalances = accounts
    .filter(
      (acc) =>
        !acc.isArchived &&
        (acc.type === 'bank' || acc.type === 'cash' || acc.type === 'wallet')
    )
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // 4. Active investments (e.g. ICCSL RD, Mutual Funds)
  const totalInvestments = accounts
    .filter((acc) => !acc.isArchived && acc.type === 'investment')
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // 5. Total Accumulated Savings: Canara Bank + RD investments
  const savingsBalance = Math.round((canaraBalance + totalInvestments) * 100) / 100;

  // 6. Reserved Commitments (Primary Bank vs Total)
  const totalReservedCommitments = recurringCommitments
    .filter((comm) => comm.isActive && comm.isReservedCommitment)
    .reduce((sum, comm) => sum + (comm.amount || 0), 0);

  const hdfcReservedCommitments = recurringCommitments
    .filter(
      (comm) =>
        comm.isActive &&
        comm.isReservedCommitment &&
        (comm.accountId === primaryBankAcc?.id ||
          !comm.accountId ||
          (hdfcAcc && comm.accountId.includes('hdfc')))
    )
    .reduce((sum, comm) => sum + (comm.amount || 0), 0);

  // 7. Unbilled Credit Card Liability (Current CC balances)
  const unbilledCCLiability = accounts
    .filter((acc) => !acc.isArchived && acc.type === 'credit_card')
    .reduce((sum, acc) => sum + Math.max(0, acc.balance || 0), 0);

  // 8. Shared Group & Friend Balances (Lent vs Borrowed):
  let totalReceivables = 0;
  let totalPayables = 0;

  for (const person of people) {
    if (person.netBalance > 0) {
      totalReceivables += person.netBalance;
    } else if (person.netBalance < 0) {
      totalPayables += Math.abs(person.netBalance);
    }
  }

  // Lent: Entire amount user needs to receive
  const lent = Math.round(totalReceivables * 100) / 100;

  // Net Money Owed to Others: If payables exceed receivables, reserve the deficit
  const netMoneyOwedToOthers = Math.max(0, totalPayables - totalReceivables);

  // 9. Available to Spend: HDFC balance - CC Liability - Reserved commitments
  // If HDFC balance is ₹6,145.33 and CC is ₹4,397.61:
  // Liquid buffer before upcoming commitments is (HDFC - CC)
  const availableToSpend =
    Math.round((hdfcBalance - unbilledCCLiability - hdfcReservedCommitments) * 100) / 100;

  // 10. Total Net Worth
  const totalNetWorth =
    Math.round(
      (totalLiquidBalances +
        totalInvestments +
        totalReceivables -
        (unbilledCCLiability + totalPayables)) *
        100
    ) / 100;

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
  accountDeltas: Map<string, number>; // accountId -> balance delta (+ means increase, - means decrease)
  peopleDeltas: Map<string, number>; // personId -> netBalance delta (+ means they owe me more, - means they owe me less)
}

/**
 * Computes exact balance deltas for Accounts and People from a transaction.
 *
 * NOTE ON CREDIT CARDS:
 * Account.balance for credit cards represents current liability/outstanding debt.
 * Thus:
 * - A purchase on CC increases liability (+amount).
 * - A CC payment decreases liability (-amount).
 *
 * NOTE ON ASSET ACCOUNTS (Bank, Cash, Wallet):
 * - An expense decreases balance (-amount).
 * - Income or settlement received increases balance (+amount).
 */
export function calculateTransactionDeltas(tx: Transaction): BalanceDeltas {
  const accountDeltas = new Map<string, number>();
  const peopleDeltas = new Map<string, number>();

  const adjustAccount = (accId: string | undefined, delta: number) => {
    if (!accId) return;
    accountDeltas.set(accId, (accountDeltas.get(accId) || 0) + delta);
  };

  const adjustPerson = (pId: string | undefined, delta: number) => {
    if (!pId || pId === 'user') return;
    peopleDeltas.set(pId, (peopleDeltas.get(pId) || 0) + delta);
  };

  switch (tx.type) {
    case 'expense': {
      // Outflow from account
      adjustAccount(tx.accountId, -tx.amount);
      break;
    }

    case 'income': {
      // Inflow to account
      adjustAccount(tx.accountId, tx.amount);
      break;
    }

    case 'transfer': {
      // Outflow from source, inflow to destination
      adjustAccount(tx.accountId, -tx.amount);
      if (tx.toAccountId) {
        adjustAccount(tx.toAccountId, tx.amount);
      }
      break;
    }

    case 'credit_card_payment': {
      // Paid from bank account (outflow: -amount), inflow to CC settles liability
      adjustAccount(tx.accountId, -tx.amount);
      if (tx.toAccountId) {
        adjustAccount(tx.toAccountId, tx.amount);
      }
      break;
    }

    case 'settlement_received': {
      // Friend paid user: Liquid balance increases, friend's receivable decreases
      adjustAccount(tx.accountId, tx.amount);
      const payerId = tx.paidByPersonId !== 'user' ? tx.paidByPersonId : tx.splits[0]?.personId;
      adjustPerson(payerId, -tx.amount);
      break;
    }

    case 'settlement_paid': {
      // User paid friend: Liquid balance decreases, user payable decreases (friend netBalance increases toward 0)
      adjustAccount(tx.accountId, -tx.amount);
      const payeeId = tx.splits[0]?.personId || tx.paidByPersonId;
      adjustPerson(payeeId, tx.amount);
      break;
    }

    case 'shared_expense': {
      if (tx.paidByPersonId === 'user') {
        // User paid the entire bill:
        // 1. Account is charged full amount
        adjustAccount(tx.accountId, -tx.amount);

        // 2. Each friend owes their split share (increases receivable)
        for (const split of tx.splits) {
          if (split.personId !== 'user') {
            adjustPerson(split.personId, split.amount);
          }
        }
      } else {
        // Friend paid the entire bill (e.g. Rahul paid ₹600 for PG dinner, user's share ₹150)
        // User's bank account was NOT charged!
        // User owes the payer their personal share: payer's netBalance decreases by user's share
        adjustPerson(tx.paidByPersonId, -tx.personalExpenseAmount);
      }
      break;
    }
  }

  return { accountDeltas, peopleDeltas };
}

/**
 * Atomically records a transaction and applies the resulting balance deltas to Dexie tables.
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
      // 1. Add transaction
      await database.transactions.add(transaction);

      // 2. Apply account balance updates
      for (const [accountId, delta] of accountDeltas.entries()) {
        const acc = await database.accounts.get(accountId);
        if (acc) {
          // If CC account and normal expense/shared_expense, delta was -tx.amount.
          // For CC liability, spending increases liability (+tx.amount).
          let newBalance = acc.balance;
          if (acc.type === 'credit_card') {
            newBalance -= delta; // Invert delta: -(-amount) = +amount liability
          } else {
            newBalance += delta;
          }
          await database.accounts.update(accountId, {
            balance: Math.round(newBalance * 100) / 100,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Apply people netBalance updates
      for (const [personId, delta] of peopleDeltas.entries()) {
        const person = await database.people.get(personId);
        if (person) {
          const newNetBalance = (person.netBalance || 0) + delta;
          await database.people.update(personId, {
            netBalance: Math.round(newNetBalance * 100) / 100,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );
}

/**
 * Atomically removes a transaction and inverts its balance deltas from Accounts and People.
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

      // 2. Revert account deltas (invert delta)
      for (const [accountId, delta] of accountDeltas.entries()) {
        const acc = await database.accounts.get(accountId);
        if (acc) {
          let newBalance = acc.balance;
          if (acc.type === 'credit_card') {
            newBalance += delta; // Invert rollback
          } else {
            newBalance -= delta;
          }
          await database.accounts.update(accountId, {
            balance: Math.round(newBalance * 100) / 100,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Revert people deltas (invert delta)
      for (const [personId, delta] of peopleDeltas.entries()) {
        const person = await database.people.get(personId);
        if (person) {
          const newNetBalance = (person.netBalance || 0) - delta;
          await database.people.update(personId, {
            netBalance: Math.round(newNetBalance * 100) / 100,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  );
}
