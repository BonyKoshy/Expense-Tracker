import {
  Plus,
  Receipt,
  X,
  ArrowRightLeft,
  Repeat,
  Check,
  Calendar,
  ArrowRight,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import type {
  Account,
  Category,
  Transaction,
  RecurringCommitment,
  AvailableToSpendBreakdown,
} from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { SavingsGoalCard } from '../savings/SavingsGoalCard';
import { AnalyticsView } from '../analytics/AnalyticsView';

interface HomeViewProps {
  breakdown: AvailableToSpendBreakdown;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  todaysTransactions: Transaction[];
  dueCommitments: RecurringCommitment[];
  showArchitectureBanner: boolean;
  onDismissBanner: () => void;
  onConfirmRecurring: (comm: RecurringCommitment) => void;
  onOpenAddTx: () => void;
  onNavigateToTransactions: () => void;
}

export function HomeView({
  breakdown,
  accounts,
  categories,
  transactions,
  todaysTransactions,
  dueCommitments,
  showArchitectureBanner,
  onDismissBanner,
  onConfirmRecurring,
  onOpenAddTx,
  onNavigateToTransactions,
}: HomeViewProps) {
  return (
    <div className="space-y-4">
      {/* Hero: "Available to Spend" Material 3 Card */}
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
                {breakdown.availableToSpend > 0 ? 'Safe Margin' : 'Low Safety Buffer'}
              </span>
            </div>
            <p className="text-xs text-[#90929d] mt-1.5">
              {breakdown.primaryBankName || 'Primary Bank'}:{' '}
              <span className="font-mono text-[#c4c6cf]">
                {formatINR(breakdown.hdfcBalance)}
              </span>{' '}
              • CC Liability:{' '}
              <span className="font-mono text-[#f2b8b5]">
                -{formatINR(breakdown.unbilledCCLiability)}
              </span>{' '}
              • Reserved Commitments:{' '}
              <span className="font-mono text-[#f2b8b5]">
                -{formatINR(breakdown.hdfcReservedCommitments)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddTx}
              className="px-4 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#0d2238] font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="px-4 py-2 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#e2e2e7] font-medium text-xs border border-[#262830] flex items-center gap-1.5 transition-colors"
            >
              <Receipt className="h-4 w-4 text-[#a8c7fa]" />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards inside Hero Card */}
        <div className="mt-5 pt-4 border-t border-[#23252c] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
            <div className="text-[11px] text-[#90929d]">CC Liability</div>
            <div className="text-sm font-semibold text-[#f2b8b5] mt-0.5 font-mono">
              -{formatINR(breakdown.unbilledCCLiability)}
            </div>
            <div className="text-[10px] text-[#6c6e79] mt-0.5">Credit Card Dues</div>
          </div>

          <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
            <div className="text-[11px] text-[#90929d]">Net Money Owned</div>
            <div className="text-sm font-semibold text-[#a8dab5] mt-0.5 font-mono">
              {formatINR(breakdown.netMoneyOwned)}
            </div>
            <div className="text-[10px] text-[#6c6e79] mt-0.5">
              {breakdown.primaryBankName
                ? `${breakdown.primaryBankName} + Cash`
                : 'Liquid Balances'}
            </div>
          </div>

          <div className="bg-[#111216] rounded-2xl p-3 border border-[#1e2026]">
            <div className="text-[11px] text-[#90929d]">Lent (Receivable)</div>
            <div className="text-sm font-semibold text-[#ffb787] mt-0.5 font-mono">
              +{formatINR(breakdown.lent)}
            </div>
            <div className="text-[10px] text-[#6c6e79] mt-0.5">Owed by Friends</div>
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

      {/* Cashew Killer Architecture Banner (Dismissible) */}
      {showArchitectureBanner && (
        <div className="relative rounded-[24px] bg-[#16171c] border border-[#23252c] p-4 text-xs text-[#c4c6cf] animate-in fade-in duration-200">
          <button
            type="button"
            onClick={onDismissBanner}
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
                When you pay a bulk bill (e.g. ₹1,505 on credit card at DMart) for 5 people:
                your personal expense increases <strong>only by ₹282.25</strong>. The rest is
                booked as <strong>receivables</strong>. When a friend repays via GPay,{' '}
                <strong>₹0</strong> is counted as income — liquid cash increases and friend debt
                clears.
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
                  <div className="text-xs font-medium text-[#e2e2e7]">{comm.name}</div>
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
                    onClick={() => onConfirmRecurring(comm)}
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
            onClick={onNavigateToTransactions}
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
                onClick={onOpenAddTx}
                className="px-3.5 py-1.5 rounded-full bg-[#a8c7fa] text-[#0d2238] font-semibold text-xs hover:bg-[#b8d4ff] transition-colors"
              >
                + Add Today&apos;s Expense
              </button>
              <button
                type="button"
                onClick={onNavigateToTransactions}
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
        onQuickTransferToSavings={onOpenAddTx}
      />

      {/* Category Spend Donut Chart */}
      <div className="pt-1">
        <AnalyticsView transactions={transactions} categories={categories} />
      </div>
    </div>
  );
}
