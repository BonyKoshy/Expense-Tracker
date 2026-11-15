import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wallet,
  Users,
  Repeat,
  Tags,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CreditCard,
  Banknote,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import { db, ensureSeeded, resetDatabaseToDefaults } from './db';
import {
  calculateAvailableToSpend,
  recordTransaction,
} from './services/accountingEngine';
import { formatINR, formatDate } from './utils/formatters';
import type { Transaction } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'shared' | 'accounts' | 'recurring' | 'categories'
  >('overview');
  const [isResetting, setIsResetting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  // Quick simulate: Sneha repays ₹305.50 via UPI GPay
  const handleSimulateSettlement = async (personId: string, personName: string, amount: number) => {
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">
                FinTrack PWA
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Cashew Killer
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0 hidden sm:block">
              Local-first PG splits, async settlements &amp; available to spend engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>IndexedDB Local-First</span>
          </div>

          <button
            onClick={handleResetData}
            disabled={isResetting}
            title="Reset to default seed dataset"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white transition-all border border-slate-700/60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`}
            />
            <span className="hidden md:inline">Reset Seed</span>
          </button>
        </div>
      </header>

      {/* Global Notification Banner */}
      {actionNotice && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero: "Available to Spend" Intelligence Card */}
      <div className="px-4 lg:px-8 pt-6 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 p-5 lg:p-7 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                  True Financial Metric
                </span>
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Available to Spend = Liquid Balances - (Reserved + CC Liability + Net Debt)
                </p>
                <div className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mt-1">
                  {formatINR(breakdown.availableToSpend)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 min-w-[130px]">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Total Net Worth
                  </div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400">
                    {formatINR(breakdown.totalNetWorth)}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 min-w-[130px]">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Friends Owe You
                  </div>
                  <div className="text-base sm:text-lg font-bold text-amber-400">
                    {formatINR(breakdown.totalReceivables)}
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Variable Pills */}
            <div className="mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800">
                <div className="text-[11px] text-slate-400">Liquid Balances</div>
                <div className="text-sm font-semibold text-slate-100">
                  {formatINR(breakdown.totalLiquidBalances)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Bank, Cash &amp; Wallets
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800">
                <div className="text-[11px] text-slate-400">Reserved Commitments</div>
                <div className="text-sm font-semibold text-rose-300">
                  -{formatINR(breakdown.reservedCommitments)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Rent, RD &amp; EMI
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800">
                <div className="text-[11px] text-slate-400">Unbilled CC Liability</div>
                <div className="text-sm font-semibold text-rose-400">
                  -{formatINR(breakdown.unbilledCCLiability)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  HDFC Credit Card
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-800">
                <div className="text-[11px] text-slate-400">Net Money Owed</div>
                <div className="text-sm font-semibold text-slate-300">
                  -{formatINR(breakdown.netMoneyOwedToOthers)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  After Receivables
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 lg:px-8 mt-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-4 w-4" />
            Overview &amp; Transactions ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('shared')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'shared'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            PG Split &amp; Settlements ({people.length})
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Accounts ({accounts.length})
          </button>

          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Repeat className="h-4 w-4" />
            Recurring Commitments ({recurringCommitments.length})
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Tags className="h-4 w-4" />
            Categories &amp; Subcategories ({categories.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 px-4 lg:px-8 py-5">
        {/* TAB 1: OVERVIEW & TRANSACTIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* The Cashew Killer Highlight Callout */}
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4.5 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white m-0">
                    The Cashew Killer Architecture in Action
                  </h3>
                  <p className="mt-1 leading-relaxed text-slate-300">
                    Observe transaction <span className="font-mono text-indigo-300">#1</span> below: User paid a bulk bill of <strong className="text-white">₹1,505.00</strong> on HDFC Credit Card at DMart for 5 people.
                    User&apos;s personal expense increases <strong className="text-emerald-400">ONLY by ₹282.25</strong>. The remaining <strong className="text-amber-400">₹1,222.75</strong> is split into receivables across friends.
                    When Rahul repaid <strong className="text-white">₹305.50</strong> via GPay, <strong className="text-emerald-400">₹0</strong> was counted as income — liquid cash increased, and Rahul&apos;s debt was cleared!
                  </p>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider m-0">
                    Recorded Transactions
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Reactive local IndexedDB records
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const account = accounts.find((a) => a.id === tx.accountId);
                  const isShared = tx.type === 'shared_expense';
                  const isSettlement = tx.type === 'settlement_received';

                  return (
                    <div
                      key={tx.id}
                      className="p-4 sm:p-5 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isShared
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : isSettlement
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
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
                            <span className="font-semibold text-white text-sm">
                              {tx.title}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {tx.type.replace('_', ' ')}
                            </span>
                            {tx.groupId && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Group: {groups.find((g) => g.id === tx.groupId)?.name || tx.groupId}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
                            <span>{formatDate(tx.date)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              {account?.name || 'Account'}
                            </span>
                            {tx.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-400">{tx.notes}</span>
                              </>
                            )}
                          </div>

                          {/* Shared splits breakdown */}
                          {tx.splits && tx.splits.length > 1 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {tx.splits.map((split, idx) => {
                                const personName =
                                  split.personId === 'user'
                                    ? 'My Share'
                                    : people.find((p) => p.id === split.personId)?.name || 'Friend';
                                return (
                                  <span
                                    key={idx}
                                    className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                                      split.personId === 'user'
                                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                        : split.isSettled
                                        ? 'bg-slate-800/60 text-slate-400 line-through'
                                        : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
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

                      {/* Amounts Display */}
                      <div className="text-right shrink-0 md:pl-4">
                        <div className="text-base font-bold text-white font-mono">
                          {formatINR(tx.amount)}
                        </div>
                        {isShared && (
                          <div className="text-xs text-emerald-400 font-medium">
                            Personal Expense: {formatINR(tx.personalExpenseAmount)}
                          </div>
                        )}
                        {isSettlement && (
                          <div className="text-xs text-slate-400 font-medium">
                            Debt Repayment (₹0 Expense/Income)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHARED PG EXPENSES & SETTLEMENT ENGINE */}
        {activeTab === 'shared' && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white m-0">
                  Shared PG Expenses &amp; Asynchronous Settlements
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracks individual friends, multi-group memberships (`514`, `PG`), and pure debt repayments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Total Receivables: {formatINR(breakdown.totalReceivables)}
                </span>
              </div>
            </div>

            {/* Groups Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((grp) => (
                <div
                  key={grp.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{grp.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        Group
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{grp.description}</p>
                    <div className="text-[11px] text-slate-500 mt-2 font-mono">
                      {grp.memberIds.length} Registered Members
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* People & Balances Ledger */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider m-0">
                    Friend Balances &amp; Debt Clearance
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click &quot;Simulate GPay Settlement&quot; to test instant receivable clearance into HDFC Salary
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60">
                {people.map((p) => {
                  const owesMe = p.netBalance > 0;
                  const isSettled = p.netBalance === 0;

                  return (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-full bg-slate-800 flex items-center justify-center text-xl shrink-0 border border-slate-700">
                          {p.avatar || '👤'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {p.name}
                            </span>
                            {p.notes && (
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                {p.notes}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                            {p.phone && <span>{p.phone}</span>}
                            {p.upiId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-indigo-400">
                                  {p.upiId}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <div
                            className={`text-base font-bold font-mono ${
                              owesMe
                                ? 'text-amber-400'
                                : isSettled
                                ? 'text-slate-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {isSettled
                              ? 'All Settled (₹0)'
                              : owesMe
                              ? `Owes you ${formatINR(p.netBalance)}`
                              : `You owe ${formatINR(Math.abs(p.netBalance))}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {owesMe ? 'Receivable' : isSettled ? 'Zero liability' : 'Payable'}
                          </div>
                        </div>

                        {owesMe && (
                          <button
                            onClick={() =>
                              handleSimulateSettlement(p.id, p.name, p.netBalance)
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5"
                          >
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                            Simulate GPay
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

        {/* TAB 3: ACCOUNTS MANAGEMENT */}
        {activeTab === 'accounts' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white m-0">
                  Accounts &amp; Wallets
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extensible multi-account management with Credit Card liability tracking
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const isCC = acc.type === 'credit_card';

                return (
                  <div
                    key={acc.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2.5 rounded-xl text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: acc.color }}
                          >
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
                            <h3 className="text-sm font-bold text-white m-0">
                              {acc.name}
                            </h3>
                            <span className="text-[10px] uppercase font-mono text-slate-400">
                              {acc.institution || acc.type}
                            </span>
                          </div>
                        </div>

                        {acc.isDefault && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="mt-5">
                        <div className="text-xs text-slate-400">
                          {isCC ? 'Current Unbilled Liability' : 'Available Balance'}
                        </div>
                        <div
                          className={`text-2xl font-extrabold mt-0.5 font-mono ${
                            isCC ? 'text-rose-400' : 'text-white'
                          }`}
                        >
                          {formatINR(acc.balance)}
                        </div>
                      </div>
                    </div>

                    {isCC && acc.creditLimit && (
                      <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Credit Limit: {formatINR(acc.creditLimit)}</span>
                          <span>
                            Available:{' '}
                            {formatINR(acc.creditLimit - (acc.balance || 0))}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full"
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
          </div>
        )}

        {/* TAB 4: RECURRING COMMITMENTS */}
        {activeTab === 'recurring' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Duration-Aware Recurring Commitments
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically reserved from &quot;Available to Spend&quot; so you never accidentally overspend.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {comm.type.replace('_', ' ')}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-2 m-0">
                            {comm.name}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-white font-mono">
                            {formatINR(comm.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Due day {comm.dayOfMonth} / mo
                          </div>
                        </div>
                      </div>

                      {hasInstallments && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>
                              Installments: {comm.paidInstallments} of{' '}
                              {comm.totalInstallments}
                            </span>
                            <span className="font-semibold text-slate-200">
                              {progressPct}% Done
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          {comm.remainingAmount !== undefined && (
                            <div className="text-[11px] text-slate-400 mt-2">
                              Remaining Liability: {formatINR(comm.remainingAmount)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        {comm.isReservedCommitment
                          ? '✓ Reserved in Available to Spend'
                          : 'Not Reserved'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: CATEGORIES & SUBCATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Custom Categories &amp; Subcategories
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tier spending taxonomy designed for precise personal expense categorization
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const catSubs = subcategories.filter(
                  (s) => s.categoryId === cat.id
                );

                return (
                  <div
                    key={cat.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <h3 className="text-sm font-bold text-white m-0">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 ml-auto">
                        {cat.type}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] uppercase font-mono text-slate-400 tracking-wider mb-2">
                        Subcategories ({catSubs.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {catSubs.map((sub) => (
                          <span
                            key={sub.id}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/70 text-slate-300 border border-slate-700/60 font-medium"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 lg:px-8 text-center text-xs text-slate-500">
        FinTrack PWA • Local-first Progressive Web App • IndexedDB powered with Dexie.js
      </footer>
    </div>
  );
}
