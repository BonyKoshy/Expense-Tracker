import { useEffect, useState, useCallback } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { db, ensureSeeded, resetDatabaseToDefaults } from './db';
import { formatINR } from './utils/formatters';
import type { RecurringCommitment } from './types';
import { useFinanceData } from './hooks/useFinanceData';
import { usePwaInstall } from './hooks/usePwaInstall';
import { TopAppBar, type NavigationTab } from './components/layout/TopAppBar';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { HomeView } from './components/home/HomeView';
import { SplitsView } from './components/splits/SplitsView';
import { BudgetView } from './components/budget/BudgetView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { SettingsView } from './components/settings/SettingsView';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { ManageAccountsModal } from './components/modals/ManageAccountsModal';
import { ManagePeopleGroupsModal } from './components/modals/ManagePeopleGroupsModal';
import { ManageCategoriesModal } from './components/modals/ManageCategoriesModal';
import { ManageRecurringModal } from './components/modals/ManageRecurringModal';
import { BackupRestoreModal } from './components/modals/BackupRestoreModal';
import { UserNameModal } from './components/modals/UserNameModal';
import { checkAndTriggerDailyReminder } from './utils/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [previousTab, setPreviousTab] = useState<NavigationTab>('home');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = useCallback((msg: string, durationMs = 4000) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), durationMs);
  }, []);

  // User Profile Name State
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

  const handleSaveUserName = (newName: string) => {
    try {
      localStorage.setItem('fintrack_user_name', newName);
    } catch {
      // ignore
    }
    setUserName(newName);
    setIsNameModalOpen(false);
  };

  // Modals Visibility State
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
    showNotice(`Overall monthly budget set to ${formatINR(amount)}.`);
  };

  const handleUpdateCategoryBudget = async (categoryId: string, monthlyBudget: number) => {
    try {
      await db.categories.update(categoryId, {
        monthlyBudget,
        updatedAt: new Date().toISOString(),
      });
      showNotice('Category budget limit saved.');
    } catch (err) {
      console.error('Failed to update category budget:', err);
    }
  };

  // Cashew Killer Architecture Banner Dismissal State
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

  // Financial Data Hook
  const finance = useFinanceData();

  // PWA Install Prompt Hook
  const pwa = usePwaInstall(showNotice);

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

  const handleNavigate = (tab: NavigationTab) => {
    if (tab === 'settings') {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
  };

  const handleConfirmRecurring = async (comm: RecurringCommitment) => {
    try {
      await finance.confirmRecurringCommitment(comm);
      showNotice(`Confirmed & recorded payment of ${formatINR(comm.amount)} for ${comm.name}!`, 5000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (confirm('Delete this transaction and revert all account and friend balances?')) {
      try {
        await finance.deleteTransactionWithRevert(txId);
        showNotice('Transaction deleted and balances reverted.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSimulateSettlement = async (
    personId: string,
    personName: string,
    amount: number
  ) => {
    try {
      await finance.simulateFriendSettlement(personId, personName, amount);
      showNotice(
        `Recorded ₹${amount.toFixed(2)} settlement from ${personName}. Liquid balance increased; friend debt cleared; ₹0 counted as income!`,
        5000
      );
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
        showNotice('App reset successfully to clean factory state.');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0f12] text-[#e2e2e7] flex flex-col font-sans">
      {/* Android 17 / Material 3 Top App Bar */}
      <TopAppBar
        activeTab={activeTab}
        previousTab={previousTab}
        userName={userName}
        recurringCount={finance.recurringCommitments.length}
        transactionsCount={finance.transactions.length}
        peopleCount={finance.people.length}
        onNavigate={handleNavigate}
        onBackFromSettings={() => setActiveTab(previousTab)}
      />

      {/* Global Notification Banner */}
      {actionNotice && (
        <div className="bg-[#15241b] border-b border-[#22382a] px-4 py-2.5 text-xs text-[#a8dab5] flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#a8dab5] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-4 pb-24">
        {activeTab === 'home' && (
          <HomeView
            breakdown={finance.breakdown}
            accounts={finance.accounts}
            categories={finance.categories}
            transactions={finance.transactions}
            todaysTransactions={finance.todaysTransactions}
            dueCommitments={finance.dueCommitments}
            showArchitectureBanner={showArchitectureBanner}
            onDismissBanner={handleDismissBanner}
            onConfirmRecurring={handleConfirmRecurring}
            onOpenAddTx={() => setIsAddTxOpen(true)}
            onNavigateToTransactions={() => setActiveTab('transactions')}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetView
            accounts={finance.accounts}
            recurringCommitments={finance.recurringCommitments}
            categories={finance.categories}
            transactions={finance.transactions}
            overallMonthlyBudget={overallMonthlyBudget}
            onOpenAccounts={() => setIsAccountsOpen(true)}
            onOpenRecurring={() => setIsRecurringOpen(true)}
            onOpenSettings={() => handleNavigate('settings')}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={finance.transactions}
            accounts={finance.accounts}
            categories={finance.categories}
            subcategories={finance.subcategories}
            groups={finance.groups}
            people={finance.people}
            onDeleteTx={handleDeleteTx}
            onNewTx={() => setIsAddTxOpen(true)}
          />
        )}

        {activeTab === 'splits' && (
          <SplitsView
            groups={finance.groups}
            people={finance.people}
            transactions={finance.transactions}
            totalReceivables={finance.breakdown.totalReceivables}
            onOpenPeople={() => setIsPeopleOpen(true)}
            onSimulateSettlement={handleSimulateSettlement}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            userName={userName}
            onEditName={() => setIsNameModalOpen(true)}
            accounts={finance.accounts}
            categories={finance.categories}
            subcategories={finance.subcategories}
            people={finance.people}
            groups={finance.groups}
            recurringCommitments={finance.recurringCommitments}
            overallMonthlyBudget={overallMonthlyBudget}
            onUpdateOverallBudget={handleUpdateOverallBudget}
            onUpdateCategoryBudget={handleUpdateCategoryBudget}
            installPrompt={pwa.installPrompt}
            isAppInstalled={pwa.isAppInstalled}
            onInstallApp={pwa.handleInstallApp}
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
        className="fixed bottom-24 right-5 sm:right-7 z-30 h-16 w-16 rounded-[22px] bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-[#b8d4ff]/20"
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      {/* Android 17 / Material 3 Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onNavigate={handleNavigate} />

      {/* Modals Styled as Material 3 Bottom Sheets */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        accounts={finance.accounts}
        categories={finance.categories}
        subcategories={finance.subcategories}
        people={finance.people}
        groups={finance.groups}
        onSuccess={showNotice}
      />

      <ManageAccountsModal
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        accounts={finance.accounts}
        onSuccess={showNotice}
      />

      <ManagePeopleGroupsModal
        isOpen={isPeopleOpen}
        onClose={() => setIsPeopleOpen(false)}
        people={finance.people}
        groups={finance.groups}
        onSuccess={showNotice}
      />

      <ManageCategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={finance.categories}
        subcategories={finance.subcategories}
        onSuccess={showNotice}
      />

      <ManageRecurringModal
        isOpen={isRecurringOpen}
        onClose={() => setIsRecurringOpen(false)}
        accounts={finance.accounts}
        categories={finance.categories}
        recurringCommitments={finance.recurringCommitments}
        onSuccess={showNotice}
      />

      <BackupRestoreModal
        isOpen={isBackupOpen}
        initialTab={backupModalTab}
        onClose={() => setIsBackupOpen(false)}
        onSuccess={showNotice}
      />

      <UserNameModal
        isOpen={isNameModalOpen}
        initialName={userName}
        onClose={() => setIsNameModalOpen(false)}
        onSave={handleSaveUserName}
      />
    </div>
  );
}
