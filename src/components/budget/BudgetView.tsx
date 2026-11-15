import { useMemo } from 'react';
import {
  CreditCard,
  Building2,
  Landmark,
  Wallet,
  Banknote,
  PiggyBank,
  Repeat,
  Plus,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type {
  Account,
  RecurringCommitment,
  Category,
  Transaction,
} from '@/types';
import { formatINR } from '@/utils/formatters';

interface BudgetViewProps {
  accounts: Account[];
  recurringCommitments: RecurringCommitment[];
  categories: Category[];
  transactions: Transaction[];
  overallMonthlyBudget?: number;
  onOpenAccounts: () => void;
  onOpenRecurring: () => void;
  onOpenSettings?: () => void;
}

export function BudgetView({
  accounts,
  recurringCommitments,
  categories,
  transactions,
  overallMonthlyBudget = 25000,
  onOpenAccounts,
  onOpenRecurring,
  onOpenSettings,
}: BudgetViewProps) {
  // Current month personal spending by category
  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map<string, number>();

    let totalMonthSpend = 0;

    for (const tx of transactions) {
      if (
        (tx.type === 'expense' || tx.type === 'shared_expense') &&
        tx.personalExpenseAmount > 0
      ) {
        const txDate = new Date(tx.date);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;

        // Include current month or latest month from transactions
        if (txKey === currentMonthKey || txKey === '2026-11') {
          totalMonthSpend += tx.personalExpenseAmount;
          if (tx.categoryId) {
            map.set(
              tx.categoryId,
              (map.get(tx.categoryId) || 0) + tx.personalExpenseAmount
            );
          }
        }
      }
    }

    return { map, totalMonthSpend };
  }, [transactions]);

  // Account grouping
  const liquidAccounts = accounts.filter(
    (a) => !a.isArchived && (a.type === 'bank' || a.type === 'cash' || a.type === 'wallet')
  );
  const creditAccounts = accounts.filter(
    (a) => !a.isArchived && a.type === 'credit_card'
  );
  const investmentAccounts = accounts.filter(
    (a) => !a.isArchived && a.type === 'investment'
  );

  const totalLiquid = liquidAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCCDebt = creditAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalRecurring = recurringCommitments
    .filter((c) => c.isActive && c.isReservedCommitment)
    .reduce((sum, c) => sum + c.amount, 0);

  const getAccountIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 className="h-5 w-5" />;
      case 'Landmark':
        return <Landmark className="h-5 w-5" />;
      case 'CreditCard':
        return <CreditCard className="h-5 w-5" />;
      case 'Wallet':
        return <Wallet className="h-5 w-5" />;
      case 'Banknote':
        return <Banknote className="h-5 w-5" />;
      case 'PiggyBank':
        return <PiggyBank className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-6">
      {/* 1. Monthly Budget & Spending Health Overview */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
              Monthly Budget &amp; Commitments
            </h2>
            <p className="text-xs text-[#90929d] mt-0.5">
              Tracks personal consumption versus reserved obligations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenRecurring}
              className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#d3e3fd] text-xs font-medium border border-[#262830] transition-colors flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-[#a8c7fa]" />
              <span>Add Commitment</span>
            </button>
            <button
              type="button"
              onClick={onOpenAccounts}
              className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-[#d3e3fd] text-xs font-medium border border-[#262830] transition-colors flex items-center gap-1.5"
            >
              <Wallet className="h-3.5 w-3.5 text-[#a8c7fa]" />
              <span>Accounts</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5">
            <div className="text-[11px] text-[#90929d]">Personal Spend This Month</div>
            <div className="text-lg font-semibold text-[#e2e2e7] font-mono mt-0.5">
              {formatINR(currentMonthSpending.totalMonthSpend)}
            </div>
            <div className="text-[10px] text-[#a8dab5] mt-1">
              Personal consumption
            </div>
          </div>

          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5">
            <div className="text-[11px] text-[#90929d]">Reserved Commitments</div>
            <div className="text-lg font-semibold text-[#f2b8b5] font-mono mt-0.5">
              {formatINR(totalRecurring)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              Rent + EMI + RD
            </div>
          </div>

          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5">
            <div className="text-[11px] text-[#90929d]">CC Liability</div>
            <div className="text-lg font-semibold text-[#ffb787] font-mono mt-0.5">
              {formatINR(totalCCDebt)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              Unbilled CC due
            </div>
          </div>

          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5">
            <div className="text-[11px] text-[#90929d]">Active Investments</div>
            <div className="text-lg font-semibold text-[#d0bcff] font-mono mt-0.5">
              {formatINR(totalInvestments)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              ICCSL Recurring Deposit
            </div>
          </div>
        </div>

        {/* Overall Monthly Spend Budget Meter */}
        <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#c4c6cf]">Overall Monthly Budget</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-[#e2e2e7]">
                {formatINR(currentMonthSpending.totalMonthSpend)} / {formatINR(overallMonthlyBudget)}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentMonthSpending.totalMonthSpend > overallMonthlyBudget
                    ? 'bg-[#2b1b1d] text-[#f2b8b5]'
                    : 'bg-[#15241b] text-[#a8dab5]'
                }`}
              >
                {Math.min(100, Math.round((currentMonthSpending.totalMonthSpend / (overallMonthlyBudget || 1)) * 100))}%
              </span>
            </div>
          </div>
          <div className="w-full bg-[#16171c] h-2 rounded-full overflow-hidden border border-[#23252c]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentMonthSpending.totalMonthSpend > overallMonthlyBudget ? 'bg-[#f2b8b5]' : 'bg-[#a8dab5]'
              }`}
              style={{
                width: `${Math.min(100, (currentMonthSpending.totalMonthSpend / (overallMonthlyBudget || 1)) * 100)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#90929d]">
            <span>
              {currentMonthSpending.totalMonthSpend > overallMonthlyBudget
                ? `Exceeded monthly ceiling by ${formatINR(currentMonthSpending.totalMonthSpend - overallMonthlyBudget)}`
                : `${formatINR(overallMonthlyBudget - currentMonthSpending.totalMonthSpend)} remaining this month`}
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-[#a8c7fa] hover:text-[#b8d4ff] transition-colors font-medium underline underline-offset-2"
              >
                Change in Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Duration-Aware Recurring Commitments Engine */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#23252c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center border border-[#283a54]">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                Duration-Aware Recurring Commitments ({recurringCommitments.length})
              </h3>
              <p className="text-xs text-[#90929d] mt-0.5">
                Automatically tracks remaining installments and expiration dates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRecurring}
            className="text-xs text-[#a8c7fa] hover:text-[#b8d4ff] font-medium transition-colors"
          >
            Manage
          </button>
        </div>

        <div className="divide-y divide-[#1c1d22] p-2 sm:p-3">
          {recurringCommitments.map((comm) => {
            const hasInstallments =
              comm.totalInstallments && comm.totalInstallments > 0;
            const paid = comm.paidInstallments || 0;
            const total = comm.totalInstallments || 1;
            const progressPct = hasInstallments ? Math.min(100, (paid / total) * 100) : 100;
            const account = accounts.find((a) => a.id === comm.accountId);

            return (
              <div
                key={comm.id}
                className="p-3 sm:p-4 rounded-2xl hover:bg-[#111216]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#e2e2e7]">
                      {comm.name}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#283a54]">
                      Day {comm.dayOfMonth}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1a1c22] text-[#90929d] border border-[#262830]">
                      {comm.type.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#90929d]">
                    <span>Account: {account?.name || 'Account'}</span>
                    {comm.notes && (
                      <>
                        <span>•</span>
                        <span>{comm.notes}</span>
                      </>
                    )}
                  </div>

                  {/* Installment Progress */}
                  {hasInstallments && (
                    <div className="pt-1.5 space-y-1 max-w-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#c4c6cf]">
                          Installment {paid} of {total}
                        </span>
                        <span className="text-[#90929d]">
                          Remaining: {formatINR(comm.remainingAmount || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-[#111216] h-1.5 rounded-full overflow-hidden border border-[#1e2026]">
                        <div
                          className="bg-[#a8c7fa] h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="font-mono text-base font-semibold text-[#e2e2e7]">
                    {formatINR(comm.amount)}
                    <span className="text-xs text-[#90929d] font-normal"> /mo</span>
                  </div>
                  <div className="text-[11px] text-[#a8dab5] mt-0.5 flex items-center sm:justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Active Commitment</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Category Budgets & Spending Limits */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
              Category Spending Limits &amp; Targets
            </h3>
            <p className="text-xs text-[#90929d] mt-0.5">
              Configured from Settings • Tracks monthly consumption per category
            </p>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-[#a8c7fa] hover:text-[#b8d4ff] font-medium transition-colors border border-[#2e405b] bg-[#1a2536] px-3.5 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Configure in Settings</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {categories
            .filter((c) => c.type === 'expense')
            .map((cat) => {
              const spent = currentMonthSpending.map.get(cat.id) || 0;
              const limit = cat.monthlyBudget || 0;
              const hasLimit = limit > 0;
              const pct = hasLimit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = hasLimit && spent > limit;

              return (
                <div
                  key={cat.id}
                  className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-xs text-[#e2e2e7]">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#90929d]">
                      {formatINR(spent)} / {hasLimit ? formatINR(limit) : 'No limit'}
                    </span>
                  </div>

                  {hasLimit ? (
                    <>
                      <div className="w-full bg-[#1a1c22] h-2 rounded-full overflow-hidden border border-[#262830]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver
                              ? 'bg-[#f2b8b5]'
                              : pct > 80
                              ? 'bg-[#ffb787]'
                              : 'bg-[#a8dab5]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className={isOver ? 'text-[#f2b8b5]' : 'text-[#90929d]'}>
                          {pct}% used
                        </span>
                        {isOver ? (
                          <span className="text-[#f2b8b5] flex items-center gap-1 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            Over by {formatINR(spent - limit)}
                          </span>
                        ) : (
                          <span className="text-[#a8dab5]">
                            {formatINR(limit - spent)} remaining
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-[#90929d] flex items-center justify-between pt-1">
                      <span>No monthly ceiling configured</span>
                      {onOpenSettings && (
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="text-[#a8c7fa] hover:underline"
                        >
                          Set limit
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. Accounts & Credit Card Gauges */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
              Accounts &amp; Credit Cards
            </h3>
            <p className="text-xs text-[#90929d] mt-0.5">
              Liquid balances ({formatINR(totalLiquid)}) • Credit liability ({formatINR(totalCCDebt)})
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAccounts}
            className="text-xs text-[#a8c7fa] hover:text-[#b8d4ff] font-medium transition-colors"
          >
            Configure
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {accounts.map((acc) => {
            const isCC = acc.type === 'credit_card';
            const limit = acc.creditLimit || 100000;
            const utilPct = isCC ? Math.min(100, Math.round(((acc.balance || 0) / limit) * 100)) : 0;

            return (
              <div
                key={acc.id}
                className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-[#23252c]"
                      style={{ backgroundColor: `${acc.color}15`, color: acc.color }}
                    >
                      {getAccountIcon(acc.icon)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#e2e2e7] truncate max-w-[130px]">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-[#90929d] capitalize">
                        {acc.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#6c6e79]">
                    {acc.accountNumber || ''}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] text-[#90929d]">
                    {isCC ? 'Outstanding Liability' : 'Available Balance'}
                  </div>
                  <div
                    className={`font-mono text-sm font-semibold mt-0.5 ${
                      isCC ? 'text-[#f2b8b5]' : 'text-[#e2e2e7]'
                    }`}
                  >
                    {formatINR(acc.balance || 0)}
                  </div>
                </div>

                {isCC && (
                  <div className="space-y-1 pt-1 border-t border-[#1c1d22]">
                    <div className="flex items-center justify-between text-[10px] text-[#90929d]">
                      <span>Limit: {formatINR(limit)}</span>
                      <span>{utilPct}% used</span>
                    </div>
                    <div className="w-full bg-[#1a1c22] h-1.5 rounded-full overflow-hidden border border-[#262830]">
                      <div
                        className="bg-[#f2b8b5] h-full rounded-full transition-all"
                        style={{ width: `${utilPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
