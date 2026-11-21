import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '../types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_PEOPLE,
  INITIAL_GROUPS,
  INITIAL_RECURRING_COMMITMENTS,
  INITIAL_TRANSACTIONS,
} from './seeds';
import { deleteTransaction } from '../services/accountingEngine';

export class FinanceTrackerDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  subcategories!: Table<Subcategory, string>;
  people!: Table<Person, string>;
  groups!: Table<Group, string>;
  transactions!: Table<Transaction, string>;
  recurringCommitments!: Table<RecurringCommitment, string>;

  constructor(databaseName = 'FinanceTrackerDB') {
    super(databaseName);

    this.version(1).stores({
      accounts: 'id, name, type, isArchived',
      categories: 'id, name, type',
      subcategories: 'id, categoryId, name',
      people: 'id, name, netBalance',
      groups: 'id, name',
      transactions:
        'id, type, date, accountId, categoryId, groupId, isShared, paidByPersonId, [type+date], [accountId+date]',
      recurringCommitments:
        'id, name, type, accountId, isActive, isReservedCommitment',
    });

    this.version(2).stores({
      transactions:
        'id, type, date, accountId, toAccountId, categoryId, groupId, isShared, paidByPersonId, [type+date], [accountId+date]',
    });
  }
}

export const db = new FinanceTrackerDatabase();

/**
 * Ensures the database is initialized with default accounts, categories,
 * people, groups, recurring commitments, and sample transactions on first run.
 */
export async function ensureSeeded(database: FinanceTrackerDatabase = db): Promise<void> {
  const accountCount = await database.accounts.count();
  if (accountCount === 0) {
    await database.transaction(
      'rw',
      [
        database.accounts,
        database.categories,
        database.subcategories,
        database.people,
        database.groups,
        database.recurringCommitments,
        database.transactions,
      ],
      async () => {
        await database.accounts.bulkAdd(INITIAL_ACCOUNTS);
        await database.categories.bulkAdd(INITIAL_CATEGORIES);
        await database.subcategories.bulkAdd(INITIAL_SUBCATEGORIES);
        await database.people.bulkAdd(INITIAL_PEOPLE);
        await database.groups.bulkAdd(INITIAL_GROUPS);
        await database.recurringCommitments.bulkAdd(INITIAL_RECURRING_COMMITMENTS);
        await database.transactions.bulkAdd(INITIAL_TRANSACTIONS);
      }
    );
  }
}

/**
 * Resets the entire IndexedDB back to initial factory seed state.
 */
export async function resetDatabaseToDefaults(database: FinanceTrackerDatabase = db): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.accounts,
      database.categories,
      database.subcategories,
      database.people,
      database.groups,
      database.recurringCommitments,
      database.transactions,
    ],
    async () => {
      await database.accounts.clear();
      await database.categories.clear();
      await database.subcategories.clear();
      await database.people.clear();
      await database.groups.clear();
      await database.recurringCommitments.clear();
      await database.transactions.clear();

      await database.accounts.bulkAdd(INITIAL_ACCOUNTS);
      await database.categories.bulkAdd(INITIAL_CATEGORIES);
      await database.subcategories.bulkAdd(INITIAL_SUBCATEGORIES);
      await database.people.bulkAdd(INITIAL_PEOPLE);
      await database.groups.bulkAdd(INITIAL_GROUPS);
      await database.recurringCommitments.bulkAdd(INITIAL_RECURRING_COMMITMENTS);
      await database.transactions.bulkAdd(INITIAL_TRANSACTIONS);
    }
  );
}

/**
 * Safely deletes or archives an account while preserving financial ledger invariants.
 *
 * Modes:
 * - 'archive': Recommended non-destructive approach. Hides account while preserving all historical splits and transfers.
 * - 'cascade_revert': Force deletion. Cleanly reverses every transaction involving this account, restoring friend balances and partner accounts, then removes the account.
 */
export async function safeDeleteAccount(
  database: FinanceTrackerDatabase,
  accountId: string,
  mode: 'archive' | 'cascade_revert' = 'archive'
): Promise<{ transactionsReverted: number }> {
  const acc = await database.accounts.get(accountId);
  if (!acc) throw new Error('Account not found');

  if (mode === 'archive') {
    await database.accounts.update(accountId, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    });
    return { transactionsReverted: 0 };
  }

  // Find all transactions where this account was source or destination
  let sourceTxs: Transaction[] = [];
  try {
    sourceTxs = await database.transactions.where('accountId').equals(accountId).toArray();
  } catch {
    sourceTxs = await database.transactions.filter((tx) => tx.accountId === accountId).toArray();
  }

  let destTxs: Transaction[] = [];
  try {
    destTxs = await database.transactions.where('toAccountId').equals(accountId).toArray();
  } catch {
    destTxs = await database.transactions.filter((tx) => tx.toAccountId === accountId).toArray();
  }

  const allTxs = Array.from(new Map([...sourceTxs, ...destTxs].map((t) => [t.id, t])).values());

  // Cleanly revert each transaction
  for (const tx of allTxs) {
    await deleteTransaction(database, tx.id);
  }

  // Delete recurring commitments linked to this account
  try {
    await database.recurringCommitments.where('accountId').equals(accountId).delete();
  } catch {
    const commitments = await database.recurringCommitments
      .filter((c) => c.accountId === accountId)
      .toArray();
    for (const c of commitments) {
      await database.recurringCommitments.delete(c.id);
    }
  }

  // Delete account record
  await database.accounts.delete(accountId);

  return { transactionsReverted: allTxs.length };
}

/**
 * Safely deletes a person.
 * Enforces that unsettled debt balances must be cleared first.
 */
export async function safeDeletePerson(
  database: FinanceTrackerDatabase,
  personId: string
): Promise<void> {
  const person = await database.people.get(personId);
  if (!person) throw new Error('Friend not found');

  if (Math.abs(person.netBalance || 0) > 0.001) {
    throw new Error(
      `Cannot delete ${person.name} because they have an active balance of ₹${person.netBalance.toFixed(2)}. Settle the balance first.`
    );
  }

  // Remove person ID from any groups
  const groups = await database.groups.toArray();
  for (const group of groups) {
    if (group.memberIds.includes(personId)) {
      await database.groups.update(group.id, {
        memberIds: group.memberIds.filter((id) => id !== personId),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await database.people.delete(personId);
}
