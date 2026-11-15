import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '@/types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CATEGORIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_PEOPLE,
  INITIAL_GROUPS,
  INITIAL_RECURRING_COMMITMENTS,
  INITIAL_TRANSACTIONS,
} from './seeds';

export class FinanceTrackerDatabase extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  subcategories!: Table<Subcategory, string>;
  people!: Table<Person, string>;
  groups!: Table<Group, string>;
  transactions!: Table<Transaction, string>;
  recurringCommitments!: Table<RecurringCommitment, string>;

  constructor() {
    super('FinanceTrackerDB');

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
