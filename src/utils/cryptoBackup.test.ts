import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  validateBackupSchema,
  exportEncryptedBackup,
  restoreBackup,
} from "./cryptoBackup";
import { FinanceTrackerDatabase } from "../db";
import type { Account, Category, Subcategory, Transaction } from "../types";

describe("Cryptographic Backup Validation & Integrity (cryptoBackup.ts)", () => {
  let testDb: FinanceTrackerDatabase;

  beforeEach(async () => {
    testDb = new FinanceTrackerDatabase(
      `test_crypto_${Date.now()}_${Math.random()}`,
    );
    await testDb.open();
  });

  it("accepts valid unencrypted backup envelope containing all seven tables", () => {
    const validPlain = {
      version: 1,
      appName: "FinTrack",
      exportedAt: new Date().toISOString(),
      encrypted: false,
      data: {
        accounts: [{ id: "acc_1", name: "Bank", type: "bank", balance: 1000 }],
        categories: [
          {
            id: "cat_1",
            name: "Food",
            type: "expense",
            icon: "utensils",
            color: "#fff",
            isDefault: true,
            createdAt: "",
            updatedAt: "",
          },
        ],
        subcategories: [
          {
            id: "sub_1",
            categoryId: "cat_1",
            name: "Groceries",
            icon: "tag",
            createdAt: "",
            updatedAt: "",
          },
        ],
        people: [],
        groups: [],
        recurringCommitments: [],
        transactions: [
          { id: "tx_1", type: "expense", amount: 50, date: "2024-11-20" },
        ],
      },
    };

    const res = validateBackupSchema(validPlain);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it("rejects backup with invalid structure or missing data envelope", () => {
    const missingData = {
      version: 1,
      appName: "FinTrack",
      encrypted: false,
    };
    const res = validateBackupSchema(missingData);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Missing "data" envelope/);
  });

  it("rejects backup with malformed or missing subcategories table", () => {
    const invalidSubcats = {
      version: 1,
      appName: "FinTrack",
      encrypted: false,
      data: {
        accounts: [{ id: "acc_1", name: "Bank", type: "bank", balance: 1000 }],
        categories: [{ id: "cat_1", name: "Food" }],
        subcategories: "not-an-array",
        transactions: [
          { id: "tx_1", type: "expense", amount: 50, date: "2024-11-20" },
        ],
      },
    };
    const res1 = validateBackupSchema(invalidSubcats);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toMatch(/"subcategories" table must be an array/);

    const malformedSubcatRecord = {
      version: 1,
      appName: "FinTrack",
      encrypted: false,
      data: {
        accounts: [{ id: "acc_1", name: "Bank", type: "bank", balance: 1000 }],
        categories: [{ id: "cat_1", name: "Food" }],
        subcategories: [{ id: "sub_1" }], // missing name and categoryId
        transactions: [
          { id: "tx_1", type: "expense", amount: 50, date: "2024-11-20" },
        ],
      },
    };
    const res2 = validateBackupSchema(malformedSubcatRecord);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toMatch(/Invalid subcategory record/);
  });

  it("successfully exports and restores encrypted backup end-to-end", async () => {
    const sampleAccount: Account = {
      id: "acc_test_1",
      name: "Salary Bank",
      type: "bank",
      balance: 25000,
      currency: "INR",
      color: "#0284c7",
      icon: "landmark",
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sampleCategory: Category = {
      id: "cat_food",
      name: "Food & Dining",
      type: "expense",
      icon: "utensils",
      color: "#fff",
      isDefault: true,
      createdAt: "",
      updatedAt: "",
    };
    const sampleSubcategory: Subcategory = {
      id: "sub_groceries",
      categoryId: "cat_food",
      name: "Groceries",
      icon: "shopping-cart",
      createdAt: "",
      updatedAt: "",
    };
    const sampleTx: Transaction = {
      id: "tx_sample_1",
      type: "expense",
      title: "Supermarket purchase",
      date: "2024-11-20T10:00:00Z",
      amount: 1200,
      accountId: "acc_test_1",
      categoryId: "cat_food",
      subcategoryId: "sub_groceries",
      personalExpenseAmount: 1200,
      isShared: false,
      paidByPersonId: "user",
      splits: [],
      createdAt: "",
      updatedAt: "",
    };

    await testDb.accounts.add(sampleAccount);
    await testDb.categories.add(sampleCategory);
    await testDb.subcategories.add(sampleSubcategory);
    await testDb.transactions.add(sampleTx);

    const password = "StrongMasterPassword123!";
    const encryptedJson = await exportEncryptedBackup(password, testDb);

    // Create a fresh target DB
    const restoreDb = new FinanceTrackerDatabase(`test_restore_${Date.now()}`);
    await restoreDb.open();

    // Restore from encrypted backup
    await restoreBackup(encryptedJson, password, restoreDb);

    // Verify all records and all tables are restored
    const restoredAcc = await restoreDb.accounts.get("acc_test_1");
    expect(restoredAcc).toBeDefined();
    expect(restoredAcc?.balance).toBe(25000);

    const restoredSub = await restoreDb.subcategories.get("sub_groceries");
    expect(restoredSub).toBeDefined();
    expect(restoredSub?.name).toBe("Groceries");

    const restoredTx = await restoreDb.transactions.get("tx_sample_1");
    expect(restoredTx).toBeDefined();
    expect(restoredTx?.amount).toBe(1200);
  });

  it("fails with incorrect password without modifying or corrupting existing database", async () => {
    const existingAccount: Account = {
      id: "acc_pre_existing",
      name: "Original Account",
      type: "bank",
      balance: 99999,
      currency: "INR",
      color: "#000",
      icon: "landmark",
      isArchived: false,
      createdAt: "",
      updatedAt: "",
    };
    await testDb.accounts.add(existingAccount);

    const password = "CorrectPassword123!";
    const encryptedJson = await exportEncryptedBackup(password, testDb);

    // Attempt restore with WRONG password
    await expect(
      restoreBackup(encryptedJson, "WrongPassword999!", testDb),
    ).rejects.toThrow(/Incorrect decryption password or corrupted backup file/);

    // Existing data MUST remain completely untouched
    const afterFailedAttempt = await testDb.accounts.get("acc_pre_existing");
    expect(afterFailedAttempt).toBeDefined();
    expect(afterFailedAttempt?.balance).toBe(99999);
  });

  it("fails with tampered ciphertext (AES-GCM authentication tag mismatch) without modifying database", async () => {
    const existingAccount: Account = {
      id: "acc_original",
      name: "Safe Account",
      type: "bank",
      balance: 5000,
      currency: "INR",
      color: "#000",
      icon: "landmark",
      isArchived: false,
      createdAt: "",
      updatedAt: "",
    };
    await testDb.accounts.add(existingAccount);

    const password = "CorrectPassword123!";
    const encryptedJson = await exportEncryptedBackup(password, testDb);
    const parsed = JSON.parse(encryptedJson);

    // Tamper with ciphertext by corrupting bytes
    const tamperedCiphertext = atob(parsed.ciphertext);
    const corrupted = btoa("X" + tamperedCiphertext.slice(1));
    parsed.ciphertext = corrupted;

    const tamperedJson = JSON.stringify(parsed);

    // Attempt restore with tampered envelope
    await expect(restoreBackup(tamperedJson, password, testDb)).rejects.toThrow(
      /Authentication Tag Mismatch/,
    );

    // Database must not have been wiped or altered
    const intactAccount = await testDb.accounts.get("acc_original");
    expect(intactAccount).toBeDefined();
    expect(intactAccount?.balance).toBe(5000);
  });
});
