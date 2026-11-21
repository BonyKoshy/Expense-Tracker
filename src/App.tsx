import { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  Home,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  CheckCircle2,
  ArrowRightLeft,
  Plus,
  Settings,
  X,
  Receipt,
  PieChart,
  Calendar,
  ArrowRight,
  Repeat,
  Check,
} from 'lucide-react';
import { db, ensureSeeded, resetDatabaseToDefaults } from './db';
import {
  calculateAvailableToSpend,
  recordTransaction,
  deleteTransaction,
} from './services/accountingEngine';
import { formatINR, formatDate } from './utils/formatters';
import type { Transaction, RecurringCommitment } from './types';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { ManageAccountsModal } from './components/modals/ManageAccountsModal';
import { ManagePeopleGroupsModal } from './components/modals/ManagePeopleGroupsModal';
import { ManageCategoriesModal } from './components/modals/ManageCategoriesModal';
import { ManageRecurringModal } from './components/modals/ManageRecurringModal';
import { BackupRestoreModal } from './components/modals/BackupRestoreModal';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { BudgetView } from './components/budget/BudgetView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { SavingsGoalCard } from './components/savings/SavingsGoalCard';
import { checkAndTriggerDailyReminder } from './utils/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'budget' | 'transactions' | 'splits' | 'settings'
  >('home');
  const [previousTab, setPreviousTab] = useState<
    'home' | 'budget' | 'transactions' | 'splits'
  >('home');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // User Profile Name & First-Time Launch Popup
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('fintrack_user_name') || 'Bony';
    } catch {
      return 'Bony';
    }
  });
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fintrack_user_name') === null;
    } catch {
      return false;
    }
  });
  const [nameInput, setNameInput] = useState<string>(() => {
    try {
      return localStorage.getItem('fintrack_user_name') || 'Bony';
    } catch {
      return 'Bony';
    }
  });

  const handleSaveUserName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = nameInput.trim() || 'Bony';
    try {
      localStorage.setItem('fintrack_user_name', cleanName);
    } catch {
      // ignore
    }
    setUserName(cleanName);
    setIsNameModalOpen(false);
  };

  // Modals visibility state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [backupModalTab, setBackupModalTab] = useState<'backup' | 'restore' | 'cashew'>('backup');
  
  // Overall Monthly Spending Budget Target
  const [overallMonthlyBudget, setOverallMonthlyBudget] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('fintrack_monthly_budget');
      return stored ? Number(stored) : 25000;
    } catch {
      return 25000;
    }
  });

  const handleUpdateOverallBudget = (amount: number) => {
    setOverallMonthlyBudget(amount);
    try {
      localStorage.setItem('fintrack_monthly_budget', String(amount));
    } catch {
      // ignore
    }
    setActionNotice(`Overall monthly budget set to ${formatINR(amount)}.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleUpdateCategoryBudget = async (categoryId: string, monthlyBudget: number) => {
    try {
      await db.categories.update(categoryId, {
        monthlyBudget,
        updatedAt: new Date().toISOString(),
      });
      setActionNotice('Category budget limit saved.');
      setTimeout(() => setActionNotice(null), 2500);
    } catch (err) {
      console.error('Failed to update category budget:', err);
    }
  };

  // Android PWA WebAPK / Install Prompt Handler
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsAppInstalled(true);
        setInstallPrompt(null);
        setActionNotice('FinTrack is installing on your device!');
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
    }
  };

  const [showArchitectureBanner, setShowArchitectureBanner] = useState(() => {
    try {
      return localStorage.getItem('fintrack_dismiss_arch_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissBanner = () => {
    setShowArchitectureBanner(false);
    try {
      localStorage.setItem('fintrack_dismiss_arch_banner', 'true');
    } catch {
      // ignore
    }
  };

  // Initialize and seed database if empty
  useEffect(() => {
    ensureSeeded().catch((err) =>
      console.error('Failed to seed IndexedDB:', err)
    );
  }, []);

  // Daily Push Notification Scheduler
  useEffect(() => {
    checkAndTriggerDailyReminder().catch((err) =>
      console.warn('FinTrack: Daily reminder startup check failed:', err)
    );

    const interval = setInterval(() => {
      checkAndTriggerDailyReminder().catch((err) =>
        console.warn('FinTrack: Daily reminder interval check failed:', err)
      );
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerDailyReminder().catch((err) =>
          console.warn('FinTrack: Daily reminder visibility check failed:', err)
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Live queries from Dexie.js (Reactive updates)
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) || [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) || [];
  const subcategories = useLiveQuery(() => db.subcategories.toArray(), []) || [];
  const people = useLiveQuery(() => db.people.toArray(), []) || [];
  const groups = useLiveQuery(() => db.groups.toArray(), []) || [];
  const transactions =
    useLiveQuery(
      () => db.transactions.orderBy('date').reverse().toArray(),
      []
    ) || [];
  const recurringCommitments =
    useLiveQuery(() => db.recurringCommitments.toArray(), []) || [];

  // Core Financial Metric
  const breakdown = calculateAvailableToSpend(
    accounts,
    recurringCommitments,
    people
  );

  // Filter Today's Transactions for Home View
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todaysTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.slice(0, 10) === todayStr);
  }, [transactions, todayStr]);

  // Due / Upcoming Recurring Commitments for current cycle
  const dueCommitments = useMemo(() => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    return recurringCommitments.filter((comm) => {
      if (!comm.isActive) return false;
      // Check if a transaction was already recorded for this commitment this month
      const alreadyPaid = transactions.some(
        (tx) =>
          tx.recurringCommitmentId === comm.id &&
          tx.date.slice(0, 7) === currentMonthKey
      );
      return !alreadyPaid;
    });
  }, [recurringCommitments, transactions]);

  const handleConfirmRecurring = async (comm: RecurringCommitment) => {
    try {
      const isRD = comm.type === 'recurring_investment';
      const tx: Transaction = {
        id: `tx_rec_${Date.now()}`,
        type: isRD ? 'transfer' : 'expense',
        title: comm.name,
        date: new Date().toISOString(),
        amount: comm.amount,
        accountId: comm.accountId,
        toAccountId: isRD ? 'acc_iccsl_rd' : undefined,
        categoryId: comm.categoryId,
        subcategoryId: comm.subcategoryId,
        personalExpenseAmount: isRD ? 0 : comm.amount,
        isShared: false,
        paidByPersonId: 'user',
        splits: [{ personId: 'user', amount: comm.amount, isSettled: true }],
        notes: `Confirmed monthly commitment: ${comm.name}`,
        recurringCommitmentId: comm.id,
        isRecurring: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await recordTransaction(db, tx);

      const nextPaid = comm.paidInstallments + 1;
      const nextRemaining = comm.remainingAmount
        ? Math.max(0, comm.remainingAmount - comm.amount)
        : undefined;

      await db.recurringCommitments.update(comm.id, {
        paidInstallments: nextPaid,
        remainingAmount: nextRemaining,
        updatedAt: new Date().toISOString(),
      });

      setActionNotice(`Confirmed & recorded payment of ${formatINR(comm.amount)} for ${comm.name}!`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    if (
      confirm(
        'Reset App & Clear All Data?\n\nThis will wipe all transactions, friends, groups, commitments, and reset account balances to 0.00.\n\nAre you sure you want to proceed?'
      )
    ) {
      try {
        await resetDatabaseToDefaults();
        localStorage.removeItem('fintrack_monthly_budget');
        setOverallMonthlyBudget(25000);
        setActionNotice('App reset successfully to clean factory state.');
        setTimeout(() => setActionNotice(null), 4000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (confirm('Delete this transaction and revert all account and friend balances?')) {
      try {
        await deleteTransaction(db, txId);
        setActionNotice('Transaction deleted and balances reverted.');
        setTimeout(() => setActionNotice(null), 4000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // 1-Click Simulation for Friend GPay Settlement
  const handleSimulateSettlement = async (
    personId: string,
    personName: string,
    amount: number
  ) => {
    if (amount <= 0) return;

    try {
      const settlementTx: Transaction = {
        id: `tx_settle_${Date.now()}`,
        type: 'settlement_received',
        title: `${personName} GPay Settlement`,
        date: new Date().toISOString(),
        amount: amount,
        accountId: 'acc_hdfc_salary',
        personalExpenseAmount: 0, // CRUCIAL RULE: Never counted as income/expense
        isShared: false,
        groupId: 'group_514',
        paidByPersonId: personId,
        splits: [{ personId: personId, amount: amount, isSettled: true }],
        notes: `Simulated settlement received from ${personName} via GPay UPI into HDFC Salary account.`,
        tags: ['gpay', 'settlement', 'pg-split'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await recordTransaction(db, settlementTx);
      setActionNotice(
        `Recorded ₹${amount.toFixed(2)} settlement from ${personName}. Liquid balance increased; friend debt cleared; ₹0 counted as income!`
      );
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0f12] text-[#e2e2e7] flex flex-col font-sans">
      {/* Android 17 / Material 3 Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#0e0f12]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#1c1d22]">
        {activeTab === 'settings' ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab(previousTab)}
              className="p-2 -ml-1 rounded-full hover:bg-[#1a1c22] text-[#e2e2e7] transition-colors flex items-center justify-center"
              title="Go back"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#e2e2e7] m-0">
                Settings
              </h1>
              <p className="text-[11px] text-[#90929d] m-0">
                Taxonomy, friends &amp; backups
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#e2e2e7] m-0">
                {activeTab === 'home'
                  ? `Hi, ${userName}`
                  : activeTab === 'budget'
                  ? 'Budget & Commitments'
                  : activeTab === 'transactions'
                  ? 'Transactions'
                  : 'Shared Splits'}
              </h1>
              <p className="text-[11px] text-[#90929d] m-0">
                {activeTab === 'home'
                  ? 'Available to Spend & Live Liquidity'
                  : activeTab === 'budget'
                  ? `${recurringCommitments.length} commitments • Accounts & limits`
                  : activeTab === 'transactions'
                  ? `${transactions.length} entries across months`
                  : `${people.length} friends • Group ledgers & GPay`}
              </p>
            </div>
          </div>
        )}

        {/* Clean Right Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16171c] border border-[#23252c] text-[#a8dab5] text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a8dab5]" />
            <span>On-Device</span>
          </div>

          {activeTab !== 'settings' && (
            <button
              type="button"
              onClick={() => {
                setPreviousTab(activeTab as any);
                setActiveTab('settings');
              }}
              className="p-2 rounded-full bg-[#16171c] hover:bg-[#202228] text-[#c4c6cf] hover:text-[#e2e2e7] border border-[#23252c] transition-colors"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div className="bg-[#15241b] border-b border-[#22382a] px-4 py-2.5 text-xs text-[#a8dab5] flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#a8dab5] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero: "Available to Spend" Material 3 Card (Always highlighted on Home) */}
      {activeTab === 'home' && (
        <div className="px-4 sm:px-6 pt-5 pb-2">
          <div className="rounded-[28px] bg-[#16171c] border border-[#23252c] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase px-3 py-1 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#283a54]">
                  Available to Spend
                </span>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-normal tracking-tight font-mono text-[#e2e2e7]">
                    {formatINR(breakdown.availableToSpend)}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      breakdown.availableToSpend > 0
                        ? 'bg-[#15241b] text-[#a8dab5] border border-[#22382a]'
                        : 'bg-[#2a1f17] text-[#ffb787] border border-[#3d2c20]'
                    }`}
                  >
                    {breakdown.availableToSpend > 0
                      ? 'Safe Margin'
                      : 'Low Safety Buffer'}
                  </span>
                </div>
                <p className="text-xs text-[#90929d] mt-1.5">
                  {breakdown.primaryBankName || 'Primary Bank'}: <span className="font-mono text-[#c4c6cf]">{formatINR(breakdown.hdfcBalance)}</span> • CC Liability: <span className="font-mono text-[#f2b8b5]">-{formatINR(breakdown.unbilledCCLiability)}</span> • Reserved Commitments: <span className="font-mono text-[#f2b8b5]">-{formatINR(breakdown.hdfcReservedCommitments)}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsAddTxOpen(true)}
                  className="px-4 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Expense</span>
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className="px-4 py-2 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#e2e2e7] font-medium text-xs border border-[#262830] flex items-center gap-1.5 transition-colors"
                >
                  <Receipt className="h-4 w-4 text-[#a8c7fa]" />
                  <span>Timeline</span>
                </button>
              </div>
            </div>

            {/* User Requested 4 Metric Cards inside Hero Card */}
            <div className="mt-5 pt-4 border-t border-[#23252c] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
                <div className="text-[11px] text-[#90929d]">CC Liability</div>
                <div className="text-sm font-semibold text-[#f2b8b5] mt-0.5 font-mono">
                  -{formatINR(breakdown.unbilledCCLiability)}
                </div>
                <div className="text-[10px] text-[#6c6e79] mt-0.5">
                  Credit Card Dues
                </div>
              </div>

              <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
                <div className="text-[11px] text-[#90929d]">Net Money Owned</div>
                <div className="text-sm font-semibold text-[#a8dab5] mt-0.5 font-mono">
                  {formatINR(breakdown.netMoneyOwned)}
                </div>
                <div className="text-[10px] text-[#6c6e79] mt-0.5">
                  {breakdown.primaryBankName ? `${breakdown.primaryBankName} + Cash` : 'Liquid Balances'}
                </div>
              </div>

              <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
                <div className="text-[11px] text-[#90929d]">Lent (Receivable)</div>
                <div className="text-sm font-semibold text-[#ffb787] mt-0.5 font-mono">
                  +{formatINR(breakdown.lent)}
                </div>
                <div className="text-[10px] text-[#6c6e79] mt-0.5">
                  Owed by Friends
                </div>
              </div>

              <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
                <div className="text-[11px] text-[#90929d]">Net Worth</div>
                <div className="text-sm font-semibold text-[#d0bcff] mt-0.5 font-mono">
                  {formatINR(breakdown.totalNetWorth)}
                </div>
                <div className="text-[10px] text-[#6c6e79] mt-0.5">
                  Assets + Lent - CC Debt
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-4">
        {/* DESTINATION 1: HOME (Dashboard, Today's Activity & All Analytics Cards) */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Cashew Killer Architecture Banner (Dismissible) */}
            {showArchitectureBanner && (
              <div className="relative rounded-[24px] bg-[#16171c] border border-[#23252c] p-4 text-xs text-[#c4c6cf] animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="absolute top-3.5 right-3.5 p-1 rounded-full text-[#90929d] hover:text-[#e2e2e7] hover:bg-[#202228] transition-colors"
                  title="Dismiss banner"
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <div className="p-2.5 rounded-2xl bg-[#1a2536] text-[#a8c7fa] shrink-0 border border-[#283a54]">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                      The Cashew Killer Architecture
                    </h3>
                    <p className="mt-1 leading-relaxed text-[#c4c6cf]">
                      When you pay a bulk bill (e.g. ₹1,505 on credit card at DMart) for 5 people: your personal expense increases <strong>only by ₹282.25</strong>. The rest is booked as <strong>receivables</strong>. When a friend repays via GPay, <strong>₹0</strong> is counted as income — liquid cash increases and friend debt clears.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Due Recurring Commitments Confirmation Prompt */}
            {dueCommitments.length > 0 && (
              <div className="rounded-[24px] bg-[#16171c] border border-[#3d2c20]/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#2a1f17] text-[#ffb787] border border-[#3d2c20]">
                      <Repeat className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-[#e2e2e7] m-0">
                        Due Recurring Commitments ({dueCommitments.length})
                      </h3>
                      <p className="text-[11px] text-[#90929d] mt-0.5">
                        Current monthly cycle • Confirm payment to record &amp; update tenure
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#2a1f17] text-[#ffb787] font-medium border border-[#3d2c20]">
                    Pending
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {dueCommitments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-medium text-[#e2e2e7]">
                          {comm.name}
                        </div>
                        <div className="text-[10px] text-[#90929d] mt-0.5">
                          {comm.paidInstallments} of {comm.totalInstallments || '∞'} paid
                          {comm.dayOfMonth ? ` • Due on day ${comm.dayOfMonth}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold font-mono text-[#e2e2e7]">
                          {formatINR(comm.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConfirmRecurring(comm)}
                          className="px-3 py-1.5 rounded-full bg-[#a8dab5] hover:bg-[#b8ebd5] text-[#0d2a1a] font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirm</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ONLY THE TRANSACTION OF THE DAY */}
            <div className="rounded-[28px] bg-[#16171c] border border-[#23252c] overflow-hidden p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center border border-[#283a54]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                      Today&apos;s Activity ({todaysTransactions.length})
                    </h3>
                    <p className="text-xs text-[#90929d] mt-0.5">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('transactions')}
                  className="text-xs text-[#a8c7fa] hover:text-[#b8d4ff] font-medium flex items-center gap-1 transition-colors"
                >
                  <span>View All Months</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {todaysTransactions.length > 0 ? (
                <div className="divide-y divide-[#1c1d22]">
                  {todaysTransactions.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const isShared = tx.type === 'shared_expense';
                    const isSettlement = tx.type === 'settlement_received';

                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-[#111216]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 border ${
                              isShared
                                ? 'bg-[#2a1f17] text-[#ffb787] border-[#3d2c20]'
                                : isSettlement
                                ? 'bg-[#15241b] text-[#a8dab5] border-[#22382a]'
                                : 'bg-[#1a2536] text-[#a8c7fa] border-[#283a54]'
                            }`}
                          >
                            {isShared ? (
                              <Users className="h-4 w-4" />
                            ) : isSettlement ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-xs sm:text-sm text-[#e2e2e7]">
                              {tx.title}
                            </div>
                            <div className="text-[11px] text-[#90929d]">
                              {account?.name || 'Account'} • {formatDate(tx.date)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-mono text-xs sm:text-sm font-semibold ${
                              isSettlement
                                ? 'text-[#a8dab5]'
                                : isShared
                                ? 'text-[#ffb787]'
                                : 'text-[#e2e2e7]'
                            }`}
                          >
                            {isSettlement ? '+' : '-'}
                            {formatINR(tx.amount)}
                          </div>
                          {isShared && (
                            <div className="text-[10px] text-[#90929d] font-mono">
                              My Share: {formatINR(tx.personalExpenseAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#111216] border border-[#1e2026] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-[#c4c6cf]">
                    <CheckCircle2 className="h-4 w-4 text-[#a8dab5] shrink-0" />
                    <span>No transactions recorded today. Your daily spending margin is intact.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddTxOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-[#a8c7fa] text-[#0d2238] font-semibold text-xs hover:bg-[#b8d4ff] transition-colors"
                    >
                      + Add Today&apos;s Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('transactions')}
                      className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#e2e2e7] text-xs font-medium border border-[#262830] transition-colors"
                    >
                      Monthly History
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Savings Goal & Emergency Buffer */}
            <SavingsGoalCard
              accounts={accounts}
              categories={categories}
              transactions={transactions}
              savingsBalance={breakdown.savingsBalance}
              canaraBalance={breakdown.canaraBalance}
              totalInvestments={breakdown.totalInvestments}
              onQuickTransferToSavings={() => setIsAddTxOpen(true)}
            />

            {/* Category Spend Donut Chart */}
            <div className="pt-1">
              <AnalyticsView
                transactions={transactions}
                categories={categories}
              />
            </div>
          </div>
        )}

        {/* DESTINATION 2: BUDGET & RECURRING COMMITMENTS */}
        {activeTab === 'budget' && (
          <BudgetView
            accounts={accounts}
            recurringCommitments={recurringCommitments}
            categories={categories}
            transactions={transactions}
            overallMonthlyBudget={overallMonthlyBudget}
            onOpenAccounts={() => setIsAccountsOpen(true)}
            onOpenRecurring={() => setIsRecurringOpen(true)}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}

        {/* DESTINATION 3: TRANSACTIONS (HORIZONTALLY SCROLLABLE MONTHS) */}
        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            subcategories={subcategories}
            groups={groups}
            people={people}
            onDeleteTx={handleDeleteTx}
            onNewTx={() => setIsAddTxOpen(true)}
          />
        )}

        {/* DESTINATION 4: SHARED PG EXPENSES & SETTLEMENTS */}
        {activeTab === 'splits' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-[#90929d]">
                PG Flatmates &amp; Asynchronous Debt Clearance
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPeopleOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-medium text-[#e2e2e7] border border-[#262830] flex items-center gap-1.5 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Manage Friends</span>
                </button>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#3d2c20]">
                  Receivables: {formatINR(breakdown.totalReceivables)}
                </span>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="rounded-[24px] bg-[#16171c] border border-[#23252c] p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#e2e2e7]">{grp.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#283a54]">
                        Group
                      </span>
                    </div>
                    <p className="text-xs text-[#90929d] mt-1">{grp.description}</p>
                    <div className="text-[11px] text-[#c4c6cf] mt-2">
                      {grp.memberIds.length} members
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* People & Balances Ledger */}
            <div className="rounded-[28px] bg-[#16171c] border border-[#23252c] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#23252c]">
                <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                  Friends Ledger
                </h3>
                <p className="text-xs text-[#90929d] mt-0.5">
                  Tap &quot;Settle via GPay&quot; to test instant receivable reduction into HDFC Salary
                </p>
              </div>

              <div className="divide-y divide-[#1c1d22]">
                {people.map((p) => {
                  const owesMe = p.netBalance > 0;
                  const isSettled = p.netBalance === 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#111216]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#1a1c22] flex items-center justify-center text-lg shrink-0 border border-[#262830]">
                          {p.avatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#e2e2e7] text-sm">
                              {p.name}
                            </span>
                            {p.notes && (
                              <span className="text-[10px] text-[#90929d] px-2 py-0.5 rounded-full bg-[#111216] border border-[#1e2026]">
                                {p.notes}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#90929d] mt-0.5">
                            {p.phone && <span>{p.phone}</span>}
                            {p.upiId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[#a8c7fa]">
                                  {p.upiId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <div
                            className={`text-sm font-semibold font-mono ${
                              owesMe
                                ? 'text-[#ffb787]'
                                : isSettled
                                ? 'text-[#90929d]'
                                : 'text-[#f2b8b5]'
                            }`}
                          >
                            {isSettled
                              ? 'Settled (₹0)'
                              : owesMe
                              ? `Owes you ${formatINR(p.netBalance)}`
                              : `You owe ${formatINR(Math.abs(p.netBalance))}`}
                          </div>
                          <div className="text-[10px] text-[#90929d]">
                            {owesMe ? 'Receivable' : isSettled ? 'Settled' : 'Payable'}
                          </div>
                        </div>

                        {owesMe && (
                          <button
                            onClick={() =>
                              handleSimulateSettlement(p.id, p.name, p.netBalance)
                            }
                            className="px-3.5 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1c2e22] text-[#a8dab5] text-xs font-semibold border border-[#22382a] transition-colors flex items-center gap-1.5"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Settle via GPay
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DESTINATION 5: SETTINGS & HUB */}
        {activeTab === 'settings' && (
          <SettingsView
            userName={userName}
            onEditName={() => {
              setNameInput(userName);
              setIsNameModalOpen(true);
            }}
            accounts={accounts}
            categories={categories}
            subcategories={subcategories}
            people={people}
            groups={groups}
            recurringCommitments={recurringCommitments}
            overallMonthlyBudget={overallMonthlyBudget}
            onUpdateOverallBudget={handleUpdateOverallBudget}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
            installPrompt={installPrompt}
            isAppInstalled={isAppInstalled}
            onInstallApp={handleInstallApp}
            onOpenAccounts={() => setIsAccountsOpen(true)}
            onOpenPeople={() => setIsPeopleOpen(true)}
            onOpenCategories={() => setIsCategoriesOpen(true)}
            onOpenRecurring={() => setIsRecurringOpen(true)}
            onOpenBackup={() => {
              setBackupModalTab('backup');
              setIsBackupOpen(true);
            }}
            onOpenCashewImport={() => {
              setBackupModalTab('cashew');
              setIsBackupOpen(true);
            }}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Floating Action Button (Stock Android 17 FAB: Simple Plus Icon Only) */}
      <button
        type="button"
        onClick={() => setIsAddTxOpen(true)}
        title="New Transaction"
        aria-label="New Transaction"
        className="fixed bottom-20 right-4 sm:right-6 z-30 h-14 w-14 rounded-2xl bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-[#b8d4ff]/20"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Android 17 / Material 3 Bottom Navigation Bar (4 Destinations: Settings moved to Header) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#16171c]/95 backdrop-blur-md border-t border-[#23252c] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {/* Destination 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'home'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'text-[#c4c6cf] group-hover:text-[#e2e2e7]'
            }`}
          >
            <Home className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'home' ? 'text-[#d3e3fd]' : 'text-[#90929d]'
            }`}
          >
            Home
          </span>
        </button>

        {/* Destination 2: Budget */}
        <button
          onClick={() => setActiveTab('budget')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'budget'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'text-[#c4c6cf] group-hover:text-[#e2e2e7]'
            }`}
          >
            <PieChart className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'budget' ? 'text-[#d3e3fd]' : 'text-[#90929d]'
            }`}
          >
            Budget
          </span>
        </button>

        {/* Destination 3: Transactions */}
        <button
          onClick={() => setActiveTab('transactions')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'transactions'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'text-[#c4c6cf] group-hover:text-[#e2e2e7]'
            }`}
          >
            <Receipt className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'transactions' ? 'text-[#d3e3fd]' : 'text-[#90929d]'
            }`}
          >
            Transactions
          </span>
        </button>

        {/* Destination 4: Splits */}
        <button
          onClick={() => setActiveTab('splits')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'splits'
                ? 'bg-[#1a2536] text-[#d3e3fd]'
                : 'text-[#c4c6cf] group-hover:text-[#e2e2e7]'
            }`}
          >
            <Users className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'splits' ? 'text-[#d3e3fd]' : 'text-[#90929d]'
            }`}
          >
            Splits
          </span>
        </button>
      </nav>

      {/* Modals Styled as Material 3 Bottom Sheets */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        accounts={accounts}
        categories={categories}
        subcategories={subcategories}
        people={people}
        groups={groups}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 5000);
        }}
      />

      <ManageAccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        accounts={accounts}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <ManagePeopleGroupsModal
        isOpen={isPeopleOpen}
        onClose={() => setIsPeopleOpen(false)}
        people={people}
        groups={groups}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <ManageCategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={categories}
        subcategories={subcategories}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <ManageRecurringModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        accounts={accounts}
        categories={categories}
        recurringCommitments={recurringCommitments}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      <BackupRestoreModal
        isOpen={isBackupOpen}
        initialTab={backupModalTab}
        onClose={() => setIsBackupOpen(false)}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      {/* First-Time Launch & Profile Name Customization Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1.5">
              <div className="h-12 w-12 rounded-2xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center mx-auto text-xl font-bold border border-[#283a54]">
                👋
              </div>
              <h2 className="text-lg font-semibold text-[#e2e2e7]">Welcome to FinTrack</h2>
              <p className="text-xs text-[#90929d]">
                What should we call you?
              </p>
            </div>

            <form onSubmit={handleSaveUserName} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#c4c6cf] mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Bony"
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-sm text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                {localStorage.getItem('fintrack_user_name') && (
                  <button
                    type="button"
                    onClick={() => setIsNameModalOpen(false)}
                    className="flex-1 py-2.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#e2e2e7] font-medium text-xs border border-[#262830] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] font-semibold text-xs transition-colors shadow-sm"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
