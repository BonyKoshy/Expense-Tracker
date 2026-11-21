import { describe, it, expect } from 'vitest';
import { validateBackupSchema, restoreBackup } from './cryptoBackup';

describe('Cryptographic Backup Validation (cryptoBackup.ts)', () => {
  it('accepts valid unencrypted backup envelope', () => {
    const validPlain = {
      version: 1,
      appName: 'FinTrack',
      exportedAt: new Date().toISOString(),
      encrypted: false,
      data: {
        accounts: [{ id: 'acc_1', name: 'Bank', type: 'bank', balance: 1000 }],
        categories: [],
        subcategories: [],
        people: [],
        groups: [],
        recurringCommitments: [],
        transactions: [{ id: 'tx_1', type: 'expense', amount: 50, date: '2024-11-20' }],
      },
    };

    const res = validateBackupSchema(validPlain);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('rejects backup with invalid structure or missing data envelope', () => {
    const missingData = {
      version: 1,
      appName: 'FinTrack',
      encrypted: false,
    };
    const res = validateBackupSchema(missingData);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Missing "data" envelope/);
  });

  it('rejects plain backup with missing core tables', () => {
    const missingAccounts = {
      version: 1,
      appName: 'FinTrack',
      encrypted: false,
      data: {
        transactions: [],
      },
    };
    const res1 = validateBackupSchema(missingAccounts);
    expect(res1.isValid).toBe(false);
    expect(res1.error).toMatch(/missing "accounts" table/);

    const missingTxs = {
      version: 1,
      appName: 'FinTrack',
      encrypted: false,
      data: {
        accounts: [],
      },
    };
    const res2 = validateBackupSchema(missingTxs);
    expect(res2.isValid).toBe(false);
    expect(res2.error).toMatch(/missing "transactions" table/);
  });

  it('restoreBackup throws on unrecognized backup or missing password for encrypted file', async () => {
    await expect(restoreBackup('{"someRandomJson": 123}')).rejects.toThrow(
      /Unrecognized backup file structure/
    );

    const encryptedWithoutPassword = JSON.stringify({
      version: 1,
      encrypted: true,
      exportedAt: new Date().toISOString(),
      salt: 'abc',
      iv: 'def',
      ciphertext: 'ghi',
    });

    await expect(restoreBackup(encryptedWithoutPassword)).rejects.toThrow(
      /password-protected/
    );
  });
});
