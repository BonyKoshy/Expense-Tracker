import { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Lock,
  FileJson,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  exportEncryptedBackup,
  exportPlainBackup,
  restoreBackup,
} from '@/utils/cryptoBackup';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  onSuccess,
}: BackupRestoreModalProps) {
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportEncrypted = async () => {
    setErrorMessage(null);
    if (!encryptPassword || encryptPassword.length < 6) {
      setErrorMessage('Please enter a password with at least 6 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const encryptedJson = await exportEncryptedBackup(encryptPassword);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(
        encryptedJson,
        `fintrack-backup-encrypted-${dateStr}.json`
      );
      setStatusMessage('Encrypted backup generated and downloaded!');
      setEncryptPassword('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPlain = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const plainJson = await exportPlainBackup();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadFile(plainJson, `fintrack-backup-plain-${dateStr}.json`);
      setStatusMessage('Plain JSON backup generated and downloaded!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (parsed.encrypted === true && !decryptPassword) {
        setErrorMessage(
          'This file is encrypted with a password. Please enter your password above and re-select the file.'
        );
        setIsProcessing(false);
        return;
      }

      await restoreBackup(text, decryptPassword || undefined);
      setStatusMessage(
        'Database successfully restored! All accounts, transactions, and splits updated.'
      );
      if (onSuccess) {
        onSuccess('Database restored successfully from backup file.');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to restore backup'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Encrypted Backup &amp; Restore
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Local-first data ownership using Web Crypto AES-GCM 256-bit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Encrypted Export */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Secure Encrypted Export (Recommended)
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Encrypts all accounts, friends, groups, and transactions using PBKDF2 (100,000 rounds) and AES-GCM 256-bit encryption. Safe to back up to Google Drive or email.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="password"
                placeholder="Set backup encryption password"
                value={encryptPassword}
                onChange={(e) => setEncryptPassword(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleExportEncrypted}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
              >
                <Download className="h-4 w-4" />
                <span>Export Encrypted</span>
              </button>
            </div>
          </div>

          {/* Section 2: Plain JSON Export */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Plain JSON Export
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportPlain}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Plain JSON</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Unencrypted raw JSON file for quick spreadsheet audits or local debugging.
            </p>
          </div>

          {/* Section 3: Restore Database */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Restore From Backup File
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload a previously exported `.json` file. If the file was encrypted, enter the password below before selecting the file.
            </p>

            <div className="space-y-2 pt-1">
              <input
                type="password"
                placeholder="Enter password (if backup was encrypted)"
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-input"
              />

              <label
                htmlFor="backup-file-input"
                className="w-full p-4 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/50 hover:bg-slate-900 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center text-xs text-slate-300"
              >
                <Upload className="h-5 w-5 text-indigo-400" />
                <span className="font-semibold">Click to select backup .json file</span>
                <span className="text-[11px] text-slate-500">
                  Restores accounts, transactions, and group split history
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
