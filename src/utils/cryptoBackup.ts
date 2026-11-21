import { db, type FinanceTrackerDatabase } from '../db';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    accounts: Account[];
    categories: Category[];
    subcategories: Subcategory[];
    people: Person[];
    groups: Group[];
    transactions: Transaction[];
    recurringCommitments: RecurringCommitment[];
  };
}

export interface EncryptedBackupEnvelope {
  version: number;
  encrypted: true;
  exportedAt: string;
  algorithm: 'AES-GCM-256';
  kdf: 'PBKDF2';
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Validates the schema of an unencrypted BackupData object
 * before any database operations are permitted.
 */
export function validateBackupSchema(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Backup root must be an object.' };
  }
  if (!data.data || typeof data.data !== 'object') {
    return { isValid: false, error: 'Missing "data" envelope in backup.' };
  }

  const { accounts, categories, transactions, people, groups, recurringCommitments } = data.data;

  if (!Array.isArray(accounts)) {
    return { isValid: false, error: 'Backup missing "accounts" table.' };
  }
  for (const acc of accounts) {
    if (!acc.id || !acc.name || typeof acc.balance !== 'number') {
      return { isValid: false, error: `Invalid account record: ${JSON.stringify(acc)}` };
    }
  }

  if (!Array.isArray(transactions)) {
    return { isValid: false, error: 'Backup missing "transactions" table.' };
  }
  for (const tx of transactions) {
    if (!tx.id || !tx.type || typeof tx.amount !== 'number' || !tx.date) {
      return { isValid: false, error: `Invalid transaction record: ${JSON.stringify(tx)}` };
    }
  }

  if (people && !Array.isArray(people)) {
    return { isValid: false, error: '"people" table must be an array.' };
  }
  if (categories && !Array.isArray(categories)) {
    return { isValid: false, error: '"categories" table must be an array.' };
  }
  if (groups && !Array.isArray(groups)) {
    return { isValid: false, error: '"groups" table must be an array.' };
  }
  if (recurringCommitments && !Array.isArray(recurringCommitments)) {
    return { isValid: false, error: '"recurringCommitments" table must be an array.' };
  }

  return { isValid: true };
}

/**
 * Extracts all data from Dexie tables into a structured backup object.
 */
export async function generateBackupData(database: FinanceTrackerDatabase = db): Promise<BackupData> {
  const [
    accounts,
    categories,
    subcategories,
    people,
    groups,
    transactions,
    recurringCommitments,
  ] = await Promise.all([
    database.accounts.toArray(),
    database.categories.toArray(),
    database.subcategories.toArray(),
    database.people.toArray(),
    database.groups.toArray(),
    database.transactions.toArray(),
    database.recurringCommitments.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      accounts,
      categories,
      subcategories,
      people,
      groups,
      transactions,
      recurringCommitments,
    },
  };
}

/**
 * Exports data as password-encrypted JSON envelope using AES-GCM-256 + PBKDF2.
 */
export async function exportEncryptedBackup(
  password: string,
  database: FinanceTrackerDatabase = db
): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Encryption password must be at least 6 characters long.');
  }

  const backup = await generateBackupData(database);
  const plainText = JSON.stringify(backup);

  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const envelope: EncryptedBackupEnvelope = {
    version: 1,
    encrypted: true,
    exportedAt: backup.exportedAt,
    algorithm: 'AES-GCM-256',
    kdf: 'PBKDF2',
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuffer),
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Exports unencrypted plain JSON backup for spreadsheet auditing.
 */
export async function exportPlainBackup(
  database: FinanceTrackerDatabase = db
): Promise<string> {
  const backup = await generateBackupData(database);
  return JSON.stringify(backup, null, 2);
}

/**
 * Imports a backup file (either plain JSON or password-protected AES-GCM envelope)
 * and safely restores it into Dexie.js with pre-restore schema validation and rollback protection.
 */
export async function restoreBackup(
  fileContent: string,
  password?: string,
  database: FinanceTrackerDatabase = db
): Promise<BackupData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('Invalid JSON file format.');
  }

  const envelope = parsed as Record<string, unknown>;
  let backupData: BackupData;

  if (envelope.encrypted === true) {
    if (!password) {
      throw new Error('This backup is password-protected. Please enter the decryption password.');
    }

    const encrypted = envelope as unknown as EncryptedBackupEnvelope;
    if (!encrypted.salt || !encrypted.iv || !encrypted.ciphertext) {
      throw new Error('Corrupted encrypted backup envelope: missing cryptographic parameters.');
    }

    const salt = base64ToBuffer(encrypted.salt);
    const iv = base64ToBuffer(encrypted.iv);
    const ciphertext = base64ToBuffer(encrypted.ciphertext);

    const key = await deriveKey(password, salt);

    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer
      );
    } catch {
      throw new Error('Incorrect decryption password or corrupted backup file (Authentication Tag Mismatch).');
    }

    const dec = new TextDecoder();
    const plainJson = dec.decode(decryptedBuffer);
    try {
      backupData = JSON.parse(plainJson) as BackupData;
    } catch {
      throw new Error('Decrypted content is not valid JSON.');
    }
  } else if (envelope.data && typeof envelope.data === 'object') {
    backupData = envelope as unknown as BackupData;
  } else {
    throw new Error('Unrecognized backup file structure.');
  }

  // Pre-restore validation: verify table structures BEFORE touching any database tables
  const validation = validateBackupSchema(backupData);
  if (!validation.isValid) {
    throw new Error(`Backup validation failed: ${validation.error}`);
  }

  const { data } = backupData;

  // Restore into Dexie atomically inside a single 'rw' transaction
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

      if (data.accounts?.length) await database.accounts.bulkAdd(data.accounts);
      if (data.categories?.length) await database.categories.bulkAdd(data.categories);
      if (data.subcategories?.length) await database.subcategories.bulkAdd(data.subcategories);
      if (data.people?.length) await database.people.bulkAdd(data.people);
      if (data.groups?.length) await database.groups.bulkAdd(data.groups);
      if (data.recurringCommitments?.length) await database.recurringCommitments.bulkAdd(data.recurringCommitments);
      if (data.transactions?.length) await database.transactions.bulkAdd(data.transactions);
    }
  );

  return backupData;
}
