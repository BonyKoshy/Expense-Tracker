import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wallet,
  Users,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CreditCard,
  Banknote,
  Landmark,
  CheckCircle2,
  ArrowRightLeft,
  Plus,
  BarChart3,
  HardDriveDownload,
  Trash2,
  Settings,
} from 'lucide-react';
import { db, ensureSeeded, resetDatabaseToDefaults } from './db';
import {
  calculateAvailableToSpend,
  recordTransaction,
  deleteTransaction,
} from './services/accountingEngine';
import { formatINR, formatDate } from './utils/formatters';
import type { Transaction } from './types';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { ManageAccountsModal } from './components/modals/ManageAccountsModal';
import { ManagePeopleGroupsModal } from './components/modals/ManagePeopleGroupsModal';
import { ManageCategoriesModal } from './components/modals/ManageCategoriesModal';
import { ManageRecurringModal } from './components/modals/ManageRecurringModal';
import { BackupRestoreModal } from './components/modals/BackupRestoreModal';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'shared' | 'accounts' | 'analytics' | 'settings'
  >('overview');
  const [accountsViewMode, setAccountsViewMode] = useState<
    'accounts' | 'recurring'
  >('accounts');
  const [isResetting, setIsResetting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals visibility state
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isPeopleOpen, setIsPeopleOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Initialize and seed database if empty
  useEffect(() => {
    ensureSeeded().catch((err) =>
      console.error('Failed to seed IndexedDB:', err)
    );
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

  const handleResetData = async () => {
    if (confirm('Reset database back to initial seed data with sample PG split?')) {
      setIsResetting(true);
      try {
        await resetDatabaseToDefaults();
        setActionNotice('Database restored to default demo state.');
        setTimeout(() => setActionNotice(null), 4000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsResetting(false);
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

  // Quick simulate: Friend repays via UPI GPay
  const handleSimulateSettlement = async (
    personId: string,
    personName: string,
    amount: number
  ) => {
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
    <div className="min-h-screen bg-[#111318] text-[#e2e2e9] flex flex-col font-sans">
      {/* Android 17 / Material 3 Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#111318]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#282a30]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#282a30] text-[#a8c7fa] flex items-center justify-center font-bold text-lg border border-[#33353c]">
            F
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#e2e2e9] m-0">
              FinTrack
            </h1>
            <p className="text-[11px] text-[#c4c6d0] m-0">
              PG Splits &amp; Settlements
            </p>
          </div>
        </div>

        {/* Top App Bar Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Backup / Export Button */}
          <button
            onClick={() => setIsBackupOpen(true)}
            title="Encrypted Backup / Restore"
            className="h-10 w-10 rounded-full flex items-center justify-center text-[#c4c6d0] hover:text-[#e2e2e9] hover:bg-[#282a30] transition-colors"
          >
            <HardDriveDownload className="h-5 w-5" />
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={handleResetData}
            disabled={isResetting}
            title="Reset to default seed dataset"
            className="h-10 w-10 rounded-full flex items-center justify-center text-[#c4c6d0] hover:text-[#e2e2e9] hover:bg-[#282a30] transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Settings Shortcut Button */}
          <button
            onClick={() => setActiveTab('settings')}
            title="Settings"
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] hover:text-[#e2e2e9] hover:bg-[#282a30]'
            }`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div className="bg-[#1e2a22] border-b border-[#2e4d38] px-4 py-2.5 text-xs text-[#a8dab5] flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#a8dab5] shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero: "Available to Spend" Material 3 Card (Visible on Home / Overview) */}
      {activeTab === 'overview' && (
        <div className="px-4 sm:px-6 pt-5 pb-2">
          <div className="rounded-[28px] bg-[#1e2026] border border-[#2d3139] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase px-3 py-1 rounded-full bg-[#253a5c] text-[#d3e3fd]">
                  Available to Spend
                </span>
                <div className="text-3xl sm:text-5xl font-normal tracking-tight text-[#e2e2e9] mt-3">
                  {formatINR(breakdown.availableToSpend)}
                </div>
                <p className="text-xs text-[#8e9099] mt-1.5 font-mono">
                  Liquid - (Reserved + CC Liability + Net Debt)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="bg-[#282a30] border border-[#33353c] rounded-2xl px-4 py-3 min-w-[130px]">
                  <div className="text-[11px] text-[#c4c6d0]">Net Worth</div>
                  <div className="text-base sm:text-lg font-semibold text-[#a8dab5] mt-0.5">
                    {formatINR(breakdown.totalNetWorth)}
                  </div>
                </div>

                <div className="bg-[#282a30] border border-[#33353c] rounded-2xl px-4 py-3 min-w-[130px]">
                  <div className="text-[11px] text-[#c4c6d0]">Friends Owe You</div>
                  <div className="text-base sm:text-lg font-semibold text-[#ffb77c] mt-0.5">
                    {formatINR(breakdown.totalReceivables)}
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Breakdown Chips */}
            <div className="mt-5 pt-4 border-t border-[#2d3139] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#191b20] rounded-2xl p-3 border border-[#282a30]">
                <div className="text-[11px] text-[#c4c6d0]">Liquid Balances</div>
                <div className="text-sm font-semibold text-[#e2e2e9] mt-0.5">
                  {formatINR(breakdown.totalLiquidBalances)}
                </div>
                <div className="text-[10px] text-[#8e9099] mt-0.5">
                  Bank, Cash &amp; Wallets
                </div>
              </div>

              <div className="bg-[#191b20] rounded-2xl p-3 border border-[#282a30]">
                <div className="text-[11px] text-[#c4c6d0]">Reserved Commitments</div>
                <div className="text-sm font-semibold text-[#f2b8b5] mt-0.5">
                  -{formatINR(breakdown.reservedCommitments)}
                </div>
                <div className="text-[10px] text-[#8e9099] mt-0.5">
                  Rent, RD &amp; EMI
                </div>
              </div>

              <div className="bg-[#191b20] rounded-2xl p-3 border border-[#282a30]">
                <div className="text-[11px] text-[#c4c6d0]">CC Liability</div>
                <div className="text-sm font-semibold text-[#f2b8b5] mt-0.5">
                  -{formatINR(breakdown.unbilledCCLiability)}
                </div>
                <div className="text-[10px] text-[#8e9099] mt-0.5">
                  Credit Cards
                </div>
              </div>

              <div className="bg-[#191b20] rounded-2xl p-3 border border-[#282a30]">
                <div className="text-[11px] text-[#c4c6d0]">Net Money Owed</div>
                <div className="text-sm font-semibold text-[#e2e2e9] mt-0.5">
                  -{formatINR(breakdown.netMoneyOwedToOthers)}
                </div>
                <div className="text-[10px] text-[#8e9099] mt-0.5">
                  After Receivables
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-4">
        {/* TAB 1: OVERVIEW & TRANSACTIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Cashew Killer Explanation Card */}
            <div className="rounded-[24px] bg-[#1e2026] border border-[#2d3139] p-4 text-xs text-[#c4c6d0]">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-[#282a30] text-[#a8c7fa] shrink-0">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
                    The Cashew Killer Architecture
                  </h3>
                  <p className="mt-1 leading-relaxed text-[#c4c6d0]">
                    When you pay a bulk bill (e.g. ₹1,505 on credit card at DMart) for 5 people: your personal expense increases <strong>only by ₹282.25</strong>. The rest is booked as <strong>receivables</strong>. When a friend repays via GPay, <strong>₹0</strong> is counted as income — liquid cash increases and friend debt clears.
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="rounded-[28px] bg-[#1e2026] border border-[#2d3139] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2d3139] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#e2e2e9] m-0">
                    Recent Transactions ({transactions.length})
                  </h2>
                  <p className="text-xs text-[#8e9099] mt-0.5">
                    Tap the &quot;+ New&quot; button to record spending or splits
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#282a30]">
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8e9099]">
                    No transactions recorded. Tap the + button to record one.
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const isShared = tx.type === 'shared_expense';
                    const isSettlement = tx.type === 'settlement_received';

                    return (
                      <div
                        key={tx.id}
                        className="p-4 hover:bg-[#282a30]/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-2xl shrink-0 ${
                              isShared
                                ? 'bg-[#3b2d18] text-[#ffb77c]'
                                : isSettlement
                                ? 'bg-[#1e2a22] text-[#a8dab5]'
                                : 'bg-[#282a30] text-[#a8c7fa]'
                            }`}
                          >
                            {isShared ? (
                              <Users className="h-5 w-5" />
                            ) : isSettlement ? (
                              <ArrowDownLeft className="h-5 w-5" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[#e2e2e9] text-sm">
                                {tx.title}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#282a30] text-[#c4c6d0]">
                                {tx.type.replace('_', ' ')}
                              </span>
                              {tx.groupId && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#253a5c] text-[#d3e3fd]">
                                  {groups.find((g) => g.id === tx.groupId)?.name || tx.groupId}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8e9099] mt-1">
                              <span>{formatDate(tx.date)}</span>
                              <span>•</span>
                              <span className="text-[#c4c6d0]">
                                {account?.name || 'Account'}
                              </span>
                              {tx.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-[#8e9099]">{tx.notes}</span>
                                </>
                              )}
                            </div>

                            {/* Shared splits chips */}
                            {tx.splits && tx.splits.length > 1 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {tx.splits.map((split, idx) => {
                                  const personName =
                                    split.personId === 'user'
                                      ? 'My Share'
                                      : people.find((p) => p.id === split.personId)?.name || 'Friend';
                                  return (
                                    <span
                                      key={idx}
                                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono ${
                                        split.personId === 'user'
                                          ? 'bg-[#253a5c] text-[#d3e3fd]'
                                          : split.isSettled
                                          ? 'bg-[#282a30] text-[#8e9099] line-through'
                                          : 'bg-[#3b2d18] text-[#ffb77c]'
                                      }`}
                                    >
                                      {personName}: {formatINR(split.amount)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Amount & Delete */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 md:pl-4">
                          <div className="text-right">
                            <div className="text-base font-semibold text-[#e2e2e9] font-mono">
                              {formatINR(tx.amount)}
                            </div>
                            {isShared && (
                              <div className="text-xs text-[#a8dab5] font-medium">
                                My Share: {formatINR(tx.personalExpenseAmount)}
                              </div>
                            )}
                            {isSettlement && (
                              <div className="text-xs text-[#c4c6d0]">
                                Debt Repayment (₹0 Income)
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            title="Delete transaction and revert balances"
                            className="p-2 text-[#8e9099] hover:text-[#f2b8b5] rounded-full hover:bg-[#282a30] transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHARED PG EXPENSES & SETTLEMENTS */}
        {activeTab === 'shared' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#e2e2e9] m-0">
                  Shared PG Expenses &amp; Settlements
                </h2>
                <p className="text-xs text-[#8e9099] mt-0.5">
                  Friend-wise receivables, group splits (`514`, `PG`), and debt clearance
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPeopleOpen(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#282a30] hover:bg-[#33353c] text-xs font-medium text-[#e2e2e9] border border-[#33353c] flex items-center gap-1.5 transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Manage Friends</span>
                </button>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#3b2d18] text-[#ffb77c]">
                  Receivables: {formatINR(breakdown.totalReceivables)}
                </span>
              </div>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="rounded-[24px] bg-[#1e2026] border border-[#2d3139] p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#e2e2e9]">{grp.name}</span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#253a5c] text-[#d3e3fd]">
                        Group
                      </span>
                    </div>
                    <p className="text-xs text-[#8e9099] mt-1">{grp.description}</p>
                    <div className="text-[11px] text-[#c4c6d0] mt-2">
                      {grp.memberIds.length} members
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* People & Balances Ledger */}
            <div className="rounded-[28px] bg-[#1e2026] border border-[#2d3139] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2d3139]">
                <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
                  Friends Ledger
                </h3>
                <p className="text-xs text-[#8e9099] mt-0.5">
                  Tap &quot;Settle via GPay&quot; to test instant receivable reduction into HDFC Salary
                </p>
              </div>

              <div className="divide-y divide-[#282a30]">
                {people.map((p) => {
                  const owesMe = p.netBalance > 0;
                  const isSettled = p.netBalance === 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#282a30]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#282a30] flex items-center justify-center text-lg shrink-0 border border-[#33353c]">
                          {p.avatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#e2e2e9] text-sm">
                              {p.name}
                            </span>
                            {p.notes && (
                              <span className="text-[10px] text-[#8e9099] px-2 py-0.5 rounded-full bg-[#282a30]">
                                {p.notes}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#8e9099] mt-0.5">
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
                                ? 'text-[#ffb77c]'
                                : isSettled
                                ? 'text-[#8e9099]'
                                : 'text-[#f2b8b5]'
                            }`}
                          >
                            {isSettled
                              ? 'Settled (₹0)'
                              : owesMe
                              ? `Owes you ${formatINR(p.netBalance)}`
                              : `You owe ${formatINR(Math.abs(p.netBalance))}`}
                          </div>
                          <div className="text-[10px] text-[#8e9099]">
                            {owesMe ? 'Receivable' : isSettled ? 'Settled' : 'Payable'}
                          </div>
                        </div>

                        {owesMe && (
                          <button
                            onClick={() =>
                              handleSimulateSettlement(p.id, p.name, p.netBalance)
                            }
                            className="px-3.5 py-1.5 rounded-full bg-[#1e2a22] hover:bg-[#28382d] text-[#a8dab5] text-xs font-semibold border border-[#2e4d38] transition-colors flex items-center gap-1.5"
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

        {/* TAB 3: ACCOUNTS & RECURRING */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Segmented View Switcher */}
              <div className="flex rounded-full bg-[#1e2026] p-1 border border-[#2d3139] w-fit">
                <button
                  onClick={() => setAccountsViewMode('accounts')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    accountsViewMode === 'accounts'
                      ? 'bg-[#253a5c] text-[#d3e3fd]'
                      : 'text-[#8e9099] hover:text-[#e2e2e9]'
                  }`}
                >
                  Accounts &amp; Cards ({accounts.length})
                </button>
                <button
                  onClick={() => setAccountsViewMode('recurring')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                    accountsViewMode === 'recurring'
                      ? 'bg-[#253a5c] text-[#d3e3fd]'
                      : 'text-[#8e9099] hover:text-[#e2e2e9]'
                  }`}
                >
                  Recurring &amp; EMIs ({recurringCommitments.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {accountsViewMode === 'accounts' ? (
                  <button
                    onClick={() => setIsAccountsOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-xs font-semibold text-[#003062] flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Manage Accounts</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsRecurringOpen(true)}
                    className="px-3.5 py-1.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-xs font-semibold text-[#003062] flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Manage Commitments</span>
                  </button>
                )}
              </div>
            </div>

            {/* Accounts Sub-view */}
            {accountsViewMode === 'accounts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((acc) => {
                  const isCC = acc.type === 'credit_card';

                  return (
                    <div
                      key={acc.id}
                      className="rounded-[24px] bg-[#1e2026] border border-[#2d3139] p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-[#282a30] text-[#a8c7fa] shrink-0 border border-[#33353c]">
                              {acc.type === 'credit_card' ? (
                                <CreditCard className="h-5 w-5" />
                              ) : acc.type === 'cash' ? (
                                <Banknote className="h-5 w-5" />
                              ) : acc.type === 'wallet' ? (
                                <Wallet className="h-5 w-5" />
                              ) : (
                                <Landmark className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-[#e2e2e9] m-0">
                                {acc.name}
                              </h3>
                              <span className="text-[10px] uppercase font-mono text-[#8e9099]">
                                {acc.institution || acc.type}
                              </span>
                            </div>
                          </div>

                          {acc.isDefault && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#253a5c] text-[#d3e3fd]">
                              Primary
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <div className="text-xs text-[#8e9099]">
                            {isCC ? 'Current Liability' : 'Balance'}
                          </div>
                          <div
                            className={`text-2xl font-normal mt-0.5 font-mono ${
                              isCC ? 'text-[#f2b8b5]' : 'text-[#e2e2e9]'
                            }`}
                          >
                            {formatINR(acc.balance)}
                          </div>
                        </div>
                      </div>

                      {isCC && acc.creditLimit && (
                        <div className="mt-4 pt-3 border-t border-[#2d3139] text-xs">
                          <div className="flex justify-between text-[#8e9099] text-[11px]">
                            <span>Limit: {formatINR(acc.creditLimit)}</span>
                            <span>
                              Available: {formatINR(acc.creditLimit - (acc.balance || 0))}
                            </span>
                          </div>
                          <div className="w-full bg-[#282a30] h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="bg-[#f2b8b5] h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                100,
                                ((acc.balance || 0) / acc.creditLimit) * 100
                              )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recurring Sub-view */}
            {accountsViewMode === 'recurring' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recurringCommitments.map((comm) => {
                  const hasInstallments = Boolean(comm.totalInstallments);
                  const progressPct = hasInstallments
                    ? Math.round(
                        (comm.paidInstallments / (comm.totalInstallments || 1)) * 100
                      )
                    : 0;

                  return (
                    <div
                      key={comm.id}
                      className="rounded-[24px] bg-[#1e2026] border border-[#2d3139] p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#253a5c] text-[#d3e3fd]">
                              {comm.type.replace('_', ' ')}
                            </span>
                            <h3 className="text-sm font-semibold text-[#e2e2e9] mt-2 m-0">
                              {comm.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="text-base font-semibold text-[#e2e2e9] font-mono">
                              {formatINR(comm.amount)}
                            </div>
                            <div className="text-[10px] text-[#8e9099]">
                              Day {comm.dayOfMonth} / mo
                            </div>
                          </div>
                        </div>

                        {hasInstallments && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-[#8e9099] mb-1">
                              <span>
                                {comm.paidInstallments} of {comm.totalInstallments} paid
                              </span>
                              <span className="text-[#c4c6d0]">
                                {progressPct}%
                              </span>
                            </div>
                            <div className="w-full bg-[#282a30] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#a8c7fa] h-full rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            {comm.remainingAmount !== undefined && (
                              <div className="text-[11px] text-[#8e9099] mt-1.5">
                                Remaining: {formatINR(comm.remainingAmount)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#2d3139] flex items-center justify-between text-xs">
                        <span className="text-[#8e9099]">
                          {comm.isReservedCommitment ? 'Reserved in Spend' : 'Not Reserved'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#1e2a22] text-[#a8dab5] text-[11px]">
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <AnalyticsView
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            people={people}
          />
        )}

        {/* TAB 5: SETTINGS PAGE */}
        {activeTab === 'settings' && (
          <SettingsView
            accounts={accounts}
            categories={categories}
            subcategories={subcategories}
            people={people}
            groups={groups}
            recurringCommitments={recurringCommitments}
            onOpenAccounts={() => setIsAccountsOpen(true)}
            onOpenPeople={() => setIsPeopleOpen(true)}
            onOpenCategories={() => setIsCategoriesOpen(true)}
            onOpenRecurring={() => setIsRecurringOpen(true)}
            onOpenBackup={() => setIsBackupOpen(true)}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Floating Action Button (Stock Android 17 Extended FAB) */}
      <button
        onClick={() => setIsAddTxOpen(true)}
        className="fixed bottom-20 right-4 sm:right-6 z-30 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] font-semibold text-sm shadow-xl active:scale-95 transition-all"
      >
        <Plus className="h-5 w-5" />
        <span>New Transaction</span>
      </button>

      {/* Android 17 / Material 3 Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e2026]/95 backdrop-blur-md border-t border-[#282a30] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {/* Option 1: Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'overview'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] group-hover:text-[#e2e2e9]'
            }`}
          >
            <Layers className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'overview' ? 'text-[#d3e3fd]' : 'text-[#8e9099]'
            }`}
          >
            Home
          </span>
        </button>

        {/* Option 2: Splits */}
        <button
          onClick={() => setActiveTab('shared')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'shared'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] group-hover:text-[#e2e2e9]'
            }`}
          >
            <Users className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'shared' ? 'text-[#d3e3fd]' : 'text-[#8e9099]'
            }`}
          >
            Splits
          </span>
        </button>

        {/* Option 3: Accounts */}
        <button
          onClick={() => setActiveTab('accounts')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'accounts'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] group-hover:text-[#e2e2e9]'
            }`}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'accounts' ? 'text-[#d3e3fd]' : 'text-[#8e9099]'
            }`}
          >
            Accounts
          </span>
        </button>

        {/* Option 4: Analytics */}
        <button
          onClick={() => setActiveTab('analytics')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'analytics'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] group-hover:text-[#e2e2e9]'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'analytics' ? 'text-[#d3e3fd]' : 'text-[#8e9099]'
            }`}
          >
            Analytics
          </span>
        </button>

        {/* Option 5: Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className="flex flex-col items-center gap-1 py-1 px-3 group flex-1 max-w-[80px]"
        >
          <div
            className={`px-4 py-1 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-[#253a5c] text-[#d3e3fd]'
                : 'text-[#c4c6d0] group-hover:text-[#e2e2e9]'
            }`}
          >
            <Settings className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-medium transition-colors ${
              activeTab === 'settings' ? 'text-[#d3e3fd]' : 'text-[#8e9099]'
            }`}
          >
            Settings
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
        onClose={() => setIsBackupOpen(false)}
        onSuccess={(msg) => {
          setActionNotice(msg);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />
    </div>
  );
}
