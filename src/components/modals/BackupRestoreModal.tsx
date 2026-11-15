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
      setErrorMessage('Password must be at least 6 characters.');
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
      setStatusMessage('Encrypted backup downloaded.');
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
      setStatusMessage('Plain JSON backup downloaded.');
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
          'Encrypted backup file. Please enter your password above before selecting the file.'
        );
        setIsProcessing(false);
        return;
      }

      await restoreBackup(text, decryptPassword || undefined);
      setStatusMessage('Database restored successfully.');
      if (onSuccess) {
        onSuccess('Database restored successfully from backup.');
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1e2026] border border-[#2d3139] rounded-t-[28px] sm:rounded-[28px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        <div className="w-10 h-1 rounded-full bg-[#44474f] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2d3139] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#282a30] text-[#a8c7fa] border border-[#33353c]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e9] m-0">
                Backup &amp; Restore
              </h2>
              <p className="text-xs text-[#8e9099] mt-0.5">
                Encrypted local JSON backup (AES-GCM 256-bit)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6d0] hover:text-[#e2e2e9] hover:bg-[#282a30] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-[#1e2a22] border border-[#2e4d38] text-[#a8dab5] text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-[#a8dab5]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#371e1d] border border-[#60201f] text-[#ffb4ab] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#ffb4ab]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Encrypted Export */}
          <div className="bg-[#191b20] border border-[#2d3139] rounded-[24px] p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#a8c7fa]" />
              <span className="text-xs font-semibold text-[#e2e2e9]">
                Password Protected Backup
              </span>
            </div>
            <p className="text-xs text-[#8e9099] leading-relaxed">
              Standard PBKDF2 + AES-GCM 256-bit envelope. Protects financial balances and friends data.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="password"
                placeholder="Password (minimum 6 chars)"
                value={encryptPassword}
                onChange={(e) => setEncryptPassword(e.target.value)}
                className="flex-1 bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e9] placeholder-[#8e9099] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleExportEncrypted}
                disabled={isProcessing}
                className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Plain Export */}
          <div className="bg-[#191b20] border border-[#2d3139] rounded-[24px] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-[#8e9099]" />
                <span className="text-xs font-semibold text-[#e2e2e9]">
                  Plain JSON Export
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportPlain}
                disabled={isProcessing}
                className="px-4 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-[#e2e2e9] text-xs font-medium border border-[#33353c] flex items-center gap-1.5 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </div>
            <p className="text-xs text-[#8e9099]">
              Unencrypted JSON for spreadsheet auditing.
            </p>
          </div>

          {/* Restore */}
          <div className="bg-[#191b20] border border-[#2d3139] rounded-[24px] p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#a8c7fa]" />
              <span className="text-xs font-semibold text-[#e2e2e9]">
                Restore Database
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <input
                type="password"
                placeholder="Enter password (if backup was encrypted)"
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e9] placeholder-[#8e9099] focus:outline-none"
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
                className="w-full p-4 rounded-2xl border border-dashed border-[#44474f] hover:border-[#a8c7fa] bg-[#111318] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center text-xs text-[#c4c6d0]"
              >
                <Upload className="h-5 w-5 text-[#a8c7fa]" />
                <span className="font-semibold text-[#e2e2e9]">Tap to select backup .json file</span>
                <span className="text-[11px] text-[#8e9099]">
                  Restores all accounts, splits, and history
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
