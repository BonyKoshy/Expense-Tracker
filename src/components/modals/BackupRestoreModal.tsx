import { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Lock,
  FileJson,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import {
  exportEncryptedBackup,
  exportPlainBackup,
  restoreBackup,
} from '@/utils/cryptoBackup';
import { importCashewCSV } from '@/services/cashewImporter';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  initialTab?: 'backup' | 'restore' | 'cashew';
}

export function BackupRestoreModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'backup',
}: BackupRestoreModalProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'cashew'>(initialTab);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cashewFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, initialTab]);

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

  const handleCashewCSVSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const res = await importCashewCSV(text);
      const msg = `Imported ${res.transactionsAdded} transactions, ${res.accountsAdded} accounts, and ${res.peopleAdded} friends from Cashew!`;
      setStatusMessage(msg);
      if (onSuccess) {
        onSuccess(msg);
      }
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to import Cashew CSV'
      );
    } finally {
      setIsProcessing(false);
      if (cashewFileInputRef.current) {
        cashewFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        <div className="w-10 h-1 rounded-full bg-[#23252c] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#23252c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#1a1c22] text-[#a8c7fa] border border-[#262830]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                Backup, Restore &amp; Import
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                On-device encryption &amp; Cashew CSV migration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6cf] hover:text-[#e2e2e7] hover:bg-[#1a1c22] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Material 3 Segmented Pill Tabs */}
        <div className="px-5 pt-3 pb-1 shrink-0">
          <div className="flex p-1 bg-[#111216] rounded-full border border-[#23252c]">
            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'backup'
                  ? 'bg-[#a8c7fa] text-[#003062] shadow-sm'
                  : 'text-[#90929d] hover:text-[#e2e2e7]'
              }`}
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'restore'
                  ? 'bg-[#a8c7fa] text-[#003062] shadow-sm'
                  : 'text-[#90929d] hover:text-[#e2e2e7]'
              }`}
            >
              Restore
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cashew')}
              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'cashew'
                  ? 'bg-[#a8dab5] text-[#00391c] shadow-sm'
                  : 'text-[#90929d] hover:text-[#a8dab5]'
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Cashew CSV</span>
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-[#15241b] border border-[#22382a] text-[#a8dab5] text-xs flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-[#a8dab5]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#f2b8b5]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: EXPORT / BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* Encrypted Export */}
              <div className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#a8c7fa]" />
                  <span className="text-xs font-semibold text-[#e2e2e7]">
                    Password Protected Backup
                  </span>
                </div>
                <p className="text-xs text-[#90929d] leading-relaxed">
                  PBKDF2 + AES-GCM 256-bit envelope. Protects accounts, personal expenses, and friend split debts.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="password"
                    placeholder="Password (minimum 6 chars)"
                    value={encryptPassword}
                    onChange={(e) => setEncryptPassword(e.target.value)}
                    className="flex-1 bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
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
              <div className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-[#90929d]" />
                    <span className="text-xs font-semibold text-[#e2e2e7]">
                      Plain JSON Export
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPlain}
                    disabled={isProcessing}
                    className="px-4 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#262830] text-[#e2e2e7] text-xs font-medium border border-[#262830] flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
                <p className="text-xs text-[#90929d]">
                  Unencrypted JSON for spreadsheet auditing and manual inspection.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              <div className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#a8c7fa]" />
                  <span className="text-xs font-semibold text-[#e2e2e7]">
                    Restore Database from JSON
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <input
                    type="password"
                    placeholder="Enter password (if backup was encrypted)"
                    value={decryptPassword}
                    onChange={(e) => setDecryptPassword(e.target.value)}
                    className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
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
                    className="w-full p-4 rounded-2xl border border-dashed border-[#23252c] hover:border-[#a8c7fa] bg-[#111216] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center text-xs text-[#c4c6cf]"
                  >
                    <Upload className="h-5 w-5 text-[#a8c7fa]" />
                    <span className="font-semibold text-[#e2e2e7]">Tap to select backup .json file</span>
                    <span className="text-[11px] text-[#90929d]">
                      Restores all accounts, splits, and history
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CASHEW CSV MIGRATION */}
          {activeTab === 'cashew' && (
            <div className="space-y-4">
              <div className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-[#a8dab5]" />
                  <span className="text-xs font-semibold text-[#e2e2e7]">
                    Import Cashew Export CSV
                  </span>
                </div>
                <p className="text-xs text-[#90929d] leading-relaxed">
                  FinTrack parses your Cashew CSV export, automatically discovers your accounts, categories, and group split breakdowns, and converts friend repayments into pure non-income balance transfers.
                </p>

                <div className="p-3 rounded-2xl bg-[#111216] border border-[#1a1c22] space-y-1.5 text-[11px] text-[#c4c6cf]">
                  <div className="flex items-center gap-1.5 text-[#a8dab5] font-semibold">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>How FinTrack fixes Cashew:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[#90929d] pl-1">
                    <li><strong className="text-[#e2e2e7]">DMart &amp; Pepper Leaf splits:</strong> Only personal share is counted as expense; friend shares are stored as receivables.</li>
                    <li><strong className="text-[#e2e2e7]">GPay / UPI repayments:</strong> Treated as asset transfers, not false monthly income.</li>
                    <li><strong className="text-[#e2e2e7]">Loans &amp; Lent:</strong> Booked as receivables from friends.</li>
                  </ul>
                </div>

                <div className="pt-1">
                  <input
                    type="file"
                    ref={cashewFileInputRef}
                    accept=".csv"
                    onChange={handleCashewCSVSelect}
                    className="hidden"
                    id="cashew-file-input"
                  />

                  <label
                    htmlFor="cashew-file-input"
                    className="w-full p-4 rounded-2xl border border-dashed border-[#22382a] hover:border-[#a8dab5] bg-[#111216] transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-center text-xs text-[#c4c6cf]"
                  >
                    <FileSpreadsheet className="h-6 w-6 text-[#a8dab5]" />
                    <span className="font-semibold text-[#e2e2e7]">Tap to select cashew-*.csv</span>
                    <span className="text-[11px] text-[#90929d]">
                      Supports exports from Cashew Android / iOS app
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
