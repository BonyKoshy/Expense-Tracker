import { db } from '@/db';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  RecurringCommitment,
} from '@/types';

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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
 * Extracts all data from Dexie tables into a structured backup object.
 */
export async function generateBackupData(): Promise<BackupData> {
  const [
    accounts,
    categories,
    subcategories,
    people,
    groups,
    transactions,
    recurringCommitments,
  ] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.subcategories.toArray(),
    db.people.toArray(),
    db.groups.toArray(),
    db.transactions.toArray(),
    db.recurringCommitments.toArray(),
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
export async function exportEncryptedBackup(password: string): Promise<string> {
  const backup = await generateBackupData();
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
 * Exports unencrypted plain JSON backup for auditing.
 */
export async function exportPlainBackup(): Promise<string> {
  const backup = await generateBackupData();
  return JSON.stringify(backup, null, 2);
}

/**
 * Imports a backup file (either plain JSON or password-protected AES-GCM envelope)
 * and atomically restores it into Dexie.js.
 */
export async function restoreBackup(fileContent: string, password?: string): Promise<BackupData> {
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
      throw new Error('Incorrect decryption password or corrupted backup file.');
    }

    const dec = new TextDecoder();
    const plainJson = dec.decode(decryptedBuffer);
    backupData = JSON.parse(plainJson) as BackupData;
  } else if (envelope.data && typeof envelope.data === 'object') {
    backupData = envelope as unknown as BackupData;
  } else {
    throw new Error('Unrecognized backup file structure.');
  }

  // Validate critical tables
  const { data } = backupData;
  if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
    throw new Error('Backup data is missing required financial tables.');
  }

  // Restore into Dexie atomically
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.subcategories,
      db.people,
      db.groups,
      db.recurringCommitments,
      db.transactions,
    ],
    async () => {
      await db.accounts.clear();
      await db.categories.clear();
      await db.subcategories.clear();
      await db.people.clear();
      await db.groups.clear();
      await db.recurringCommitments.clear();
      await db.transactions.clear();

      if (data.accounts.length) await db.accounts.bulkAdd(data.accounts);
      if (data.categories.length) await db.categories.bulkAdd(data.categories);
      if (data.subcategories.length) await db.subcategories.bulkAdd(data.subcategories);
      if (data.people.length) await db.people.bulkAdd(data.people);
      if (data.groups.length) await db.groups.bulkAdd(data.groups);
      if (data.recurringCommitments.length) await db.recurringCommitments.bulkAdd(data.recurringCommitments);
      if (data.transactions.length) await db.transactions.bulkAdd(data.transactions);
    }
  );

  return backupData;
}
