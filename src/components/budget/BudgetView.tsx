import { useMemo } from "react";
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
  Coffee,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  Account,
  RecurringCommitment,
  Category,
  Subcategory,
  Transaction,
  Person,
  AvailableToSpendBreakdown,
} from "@/types";
import { formatINR } from "@/utils/formatters";

interface BudgetViewProps {
  accounts: Account[];
  recurringCommitments: RecurringCommitment[];
  categories: Category[];
  subcategories?: Subcategory[];
  transactions: Transaction[];
  people?: Person[];
  breakdown?: AvailableToSpendBreakdown;
  overallMonthlyBudget?: number;
  onOpenAccounts: () => void;
  onOpenRecurring: () => void;
  onOpenSettings?: () => void;
}

export function BudgetView({
  accounts,
  recurringCommitments,
  categories,
  subcategories = [],
  transactions,
  people = [],
  breakdown,
  overallMonthlyBudget = 25000,
  onOpenAccounts,
  onOpenRecurring,
  onOpenSettings,
}: BudgetViewProps) {
  // Discover registered Tea subcategory
  const teaSubcategory = useMemo(() => {
    return subcategories.find(
      (s) => s.id === "sub_tea" || s.name.toLowerCase().includes("tea"),
    );
  }, [subcategories]);

  // Current month key for cycle calculations
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Current month personal spending by category & subcategory
  const currentMonthSpending = useMemo(() => {
    const map = new Map<string, number>();
    const subMap = new Map<string, number>();

    let totalMonthSpend = 0;
    let teaSpend = 0;
    let teaCount = 0;

    for (const tx of transactions) {
      if (
        (tx.type === "expense" || tx.type === "shared_expense") &&
        tx.personalExpenseAmount > 0
      ) {
        const txDate = new Date(tx.date);
        const txKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;

        // Include current month or latest month from transactions
        if (txKey === currentMonthKey || txKey === "2026-11") {
          totalMonthSpend += tx.personalExpenseAmount;
          if (tx.categoryId) {
            map.set(
              tx.categoryId,
              (map.get(tx.categoryId) || 0) + tx.personalExpenseAmount,
            );
          }
          if (tx.subcategoryId) {
            subMap.set(
              tx.subcategoryId,
              (subMap.get(tx.subcategoryId) || 0) + tx.personalExpenseAmount,
            );
          }

          // Check for Tea subcategory (sub_tea, title/notes/tags containing tea or chai)
          const titleLower = tx.title.toLowerCase();
          const notesLower = (tx.notes || "").toLowerCase();
          const isTea =
            (teaSubcategory && tx.subcategoryId === teaSubcategory.id) ||
            tx.subcategoryId === "sub_tea" ||
            titleLower.includes("tea") ||
            titleLower.includes("chai") ||
            notesLower.includes("tea") ||
            notesLower.includes("chai");

          if (isTea) {
            teaSpend += tx.personalExpenseAmount;
            teaCount += 1;
          }
        }
      }
    }

    return { map, subMap, totalMonthSpend, teaSpend, teaCount };
  }, [transactions, teaSubcategory, currentMonthKey]);

  // Days left in month & Daily possible spend allowance
  const monthPace = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleDateString("en-US", { month: "long" });
    const totalDays = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    // Days remaining in the month including today:
    const daysLeft = Math.max(1, totalDays - currentDay + 1);
    const daysPassed = Math.max(1, currentDay);

    const totalSpent = currentMonthSpending.totalMonthSpend;
    const remaining = overallMonthlyBudget - totalSpent;
    const dailyAllowance = remaining > 0 ? remaining / daysLeft : 0;
    const burnRate = totalSpent / daysPassed;

    return {
      monthName,
      totalDays,
      currentDay,
      daysLeft,
      daysPassed,
      remaining,
      dailyAllowance,
      burnRate,
    };
  }, [currentMonthSpending.totalMonthSpend, overallMonthlyBudget, now]);

  // Account grouping
  const liquidAccounts = accounts.filter(
    (a) =>
      !a.isArchived &&
      (a.type === "bank" || a.type === "cash" || a.type === "wallet"),
  );
  const creditAccounts = accounts.filter(
    (a) => !a.isArchived && a.type === "credit_card",
  );
  const investmentAccounts = accounts.filter(
    (a) => !a.isArchived && a.type === "investment",
  );

  const totalLiquid = liquidAccounts.reduce(
    (sum, a) => sum + (a.balance || 0),
    0,
  );
  const totalCCDebt = creditAccounts.reduce(
    (sum, a) => sum + (a.balance || 0),
    0,
  );
  const totalInvestments = investmentAccounts.reduce(
    (sum, a) => sum + (a.balance || 0),
    0,
  );

  // Filter commitments active for current month only (excludes future months)
  const totalRecurring = recurringCommitments
    .filter(
      (c) =>
        c.isActive &&
        c.isReservedCommitment &&
        (!c.startDate || c.startDate.slice(0, 7) <= currentMonthKey) &&
        (!c.endDate || c.endDate.slice(0, 7) >= currentMonthKey) &&
        (!c.totalInstallments || c.paidInstallments < c.totalInstallments),
    )
    .reduce((sum, c) => sum + c.amount, 0);

  // Split balances (Receivables vs Owed)
  const { totalReceivables, totalPayables } = useMemo(() => {
    if (breakdown) {
      return {
        totalReceivables: breakdown.totalReceivables,
        totalPayables: breakdown.totalPayables,
      };
    }
    let rec = 0;
    let pay = 0;
    for (const p of people) {
      const net = p.netBalance || 0;
      if (net > 0) rec += net;
      else if (net < 0) pay += Math.abs(net);
    }
    return { totalReceivables: rec, totalPayables: pay };
  }, [breakdown, people]);

  const netSplitBalance = totalReceivables - totalPayables;

  const getAccountIcon = (iconName: string) => {
    switch (iconName) {
      case "Building2":
        return <Building2 className="h-5 w-5" />;
      case "Landmark":
        return <Landmark className="h-5 w-5" />;
      case "CreditCard":
        return <CreditCard className="h-5 w-5" />;
      case "Wallet":
        return <Wallet className="h-5 w-5" />;
      case "Banknote":
        return <Banknote className="h-5 w-5" />;
      case "PiggyBank":
        return <PiggyBank className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-6">
      {/* 1. Monthly Budget & Spending Health Overview */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4 shadow-sm">
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

        {/* 6 Balanced Metric Summary Cards (2x3 on mobile, 3x2 on tablet, 6x1 on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Daily Spend Allowance */}
          <div className="bg-[#1a2536] border border-[#2e405b] rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#a8c7fa] flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#a8c7fa]" />
                Daily Allowance
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#111216] text-[#d3e3fd] font-mono border border-[#283a54]">
                {monthPace.daysLeft}d left
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-[#d3e3fd] mt-1">
              {formatINR(monthPace.dailyAllowance)}
              <span className="text-xs font-normal text-[#90929d]"> /d</span>
            </div>
            <div className="text-[10px] text-[#90929d] mt-1 truncate">
              {monthPace.remaining > 0
                ? `${formatINR(monthPace.remaining)} left`
                : "Budget limit reached"}
            </div>
          </div>

          {/* 2. Personal Spend */}
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[11px] text-[#90929d]">
              Personal Spend
            </div>
            <div className="text-lg sm:text-xl font-semibold text-[#e2e2e7] font-mono mt-1">
              {formatINR(currentMonthSpending.totalMonthSpend)}
            </div>
            <div className="text-[10px] text-[#a8dab5] mt-1">
              Consumption this month
            </div>
          </div>

          {/* 3. Reserved Commitments */}
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[11px] text-[#90929d]">
              Commitments
            </div>
            <div className="text-lg sm:text-xl font-semibold text-[#f2b8b5] font-mono mt-1">
              {formatINR(totalRecurring)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              Rent + EMI + RD
            </div>
          </div>

          {/* 4. CC Liability */}
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[11px] text-[#90929d]">CC Liability</div>
            <div className="text-lg sm:text-xl font-semibold text-[#ffb787] font-mono mt-1">
              {formatINR(totalCCDebt)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              Unbilled CC due
            </div>
          </div>

          {/* 5. Net Splits (Receivables - Owed) */}
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#90929d] flex items-center gap-1">
                <Users className="h-3 w-3 text-[#ffb787]" />
                Net Splits
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono border ${
                netSplitBalance >= 0
                  ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                  : "bg-[#2b1b1d] text-[#f2b8b5] border-[#5c2429]"
              }`}>
                {netSplitBalance >= 0 ? "Surplus" : "Debt"}
              </span>
            </div>
            <div className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
              netSplitBalance >= 0 ? "text-[#a8dab5]" : "text-[#f2b8b5]"
            }`}>
              {netSplitBalance >= 0 ? "+" : ""}
              {formatINR(netSplitBalance)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1 truncate">
              +{formatINR(totalReceivables)} | -{formatINR(totalPayables)}
            </div>
          </div>

          {/* 6. Active Investments */}
          <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[11px] text-[#90929d]">Investments</div>
            <div className="text-lg sm:text-xl font-semibold text-[#d0bcff] font-mono mt-1">
              {formatINR(totalInvestments)}
            </div>
            <div className="text-[10px] text-[#90929d] mt-1">
              Recurring Deposits
            </div>
          </div>
        </div>

        {/* Overall Monthly Spend Budget Meter */}
        <div className="bg-[#111216] border border-[#1e2026] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#e2e2e7]">
              Overall Monthly Budget
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-[#e2e2e7]">
                {formatINR(currentMonthSpending.totalMonthSpend)} /{" "}
                {formatINR(overallMonthlyBudget)}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentMonthSpending.totalMonthSpend > overallMonthlyBudget
                    ? "bg-[#2b1b1d] text-[#f2b8b5]"
                    : "bg-[#15241b] text-[#a8dab5]"
                }`}
              >
                {Math.min(
                  100,
                  Math.round(
                    (currentMonthSpending.totalMonthSpend /
                      (overallMonthlyBudget || 1)) *
                      100,
                  ),
                )}
                %
              </span>
            </div>
          </div>

          <div className="w-full bg-[#16171c] h-2.5 rounded-full overflow-hidden border border-[#23252c]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentMonthSpending.totalMonthSpend > overallMonthlyBudget
                  ? "bg-[#f2b8b5]"
                  : "bg-[#a8dab5]"
              }`}
              style={{
                width: `${Math.min(100, (currentMonthSpending.totalMonthSpend / (overallMonthlyBudget || 1)) * 100)}%`,
              }}
            />
          </div>

          {/* Daily Pace & Remaining Budget Split */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1 border-t border-[#1e2026] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#a8c7fa] font-bold font-mono text-sm">
                {formatINR(monthPace.dailyAllowance)} / day
              </span>
              <span className="text-[#90929d]">
                possible to spend across remaining{" "}
                <strong className="text-[#e2e2e7]">
                  {monthPace.daysLeft} days
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#90929d]">
              <span>
                {currentMonthSpending.totalMonthSpend > overallMonthlyBudget
                  ? `Over ceiling by ${formatINR(currentMonthSpending.totalMonthSpend - overallMonthlyBudget)}`
                  : `${formatINR(monthPace.remaining)} remaining this month`}
              </span>
              {onOpenSettings && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-[#a8c7fa] hover:text-[#b8d4ff] transition-colors font-medium underline underline-offset-2"
                  >
                    Settings
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Duration-Aware Recurring Commitments Engine */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#23252c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#1a2536] text-[#a8c7fa] flex items-center justify-center border border-[#283a54]">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                Duration-Aware Recurring Commitments (
                {recurringCommitments.length})
              </h3>
              <p className="text-xs text-[#90929d] mt-0.5">
                Automatically tracks remaining installments and start/expiration dates
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
            const progressPct = hasInstallments
              ? Math.min(100, (paid / total) * 100)
              : 100;
            const account = accounts.find((a) => a.id === comm.accountId);
            const isFuture = comm.startDate && comm.startDate.slice(0, 7) > currentMonthKey;

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
                      {comm.type.replace("_", " ")}
                    </span>
                    {isFuture && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#422e1e]">
                        Starts {comm.startDate}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#90929d]">
                    <span>Account: {account?.name || "Account"}</span>
                    {comm.toAccountId && (
                      <>
                        <span>→</span>
                        <span className="text-[#a8c7fa] font-medium">
                          Transfers to {accounts.find((a) => a.id === comm.toAccountId)?.name || "RD"}
                        </span>
                      </>
                    )}
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
                    <span className="text-xs text-[#90929d] font-normal">
                      {" "}
                      /mo
                    </span>
                  </div>
                  <div className="text-[11px] mt-0.5 flex items-center sm:justify-end gap-1">
                    {isFuture ? (
                      <span className="text-[#ffb787]">Upcoming Next Month</span>
                    ) : (
                      <span className="text-[#a8dab5] flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Active Commitment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Category Budgets & Spending Limits (Redesigned Visual Hierarchy) */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#e2e2e7] m-0">
              Category Spending Limits &amp; Targets
            </h3>
            <p className="text-xs text-[#90929d] mt-0.5">
              Category limits defined in Settings • Immediate consumption status
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

        {/* Featured Tea & Daily Micro-Habits Subcategory Card */}
        <div className="bg-[#16171c] border border-[#2e221b] rounded-2xl p-4 bg-gradient-to-r from-[#221813] via-[#1a1c22] to-[#16171c] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#2e1d14] text-[#ffb787] border border-[#482d1e] flex items-center justify-center shrink-0">
              <Coffee className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#e2e2e7]">
                  Tea &amp; Chai
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#111216] text-[#ffb787] border border-[#3d2c20]">
                  Subcategory
                </span>
                <span className="text-[10px] text-[#90929d]">
                  under Food &amp; Dining
                </span>
              </div>
              <p className="text-xs text-[#90929d] mt-0.5">
                {currentMonthSpending.teaCount > 0
                  ? `${currentMonthSpending.teaCount} tea breaks recorded this month • ~${formatINR(currentMonthSpending.teaSpend / monthPace.daysPassed)}/day avg pace`
                  : "Track your daily tea, chai, and coffee micro-expenses"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:text-right self-start sm:self-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#90929d]">
                Monthly Tea Spend
              </div>
              <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#ffb787]">
                {formatINR(currentMonthSpending.teaSpend)}
              </div>
            </div>
            <div className="border-l border-[#262830] pl-4">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#90929d]">
                Estimated Daily Pace
              </div>
              <div className="text-sm sm:text-base font-bold font-mono text-[#e2e2e7]">
                {formatINR(
                  currentMonthSpending.teaSpend / monthPace.daysPassed,
                )}
                <span className="text-xs font-normal text-[#90929d]">
                  {" "}
                  /d
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {categories
            .filter((c) => c.type === "expense")
            .map((cat) => {
              const spent = currentMonthSpending.map.get(cat.id) || 0;
              const limit = cat.monthlyBudget || 0;
              const hasLimit = limit > 0;
              const pct = hasLimit
                ? Math.min(100, Math.round((spent / limit) * 100))
                : 0;
              const isOver = hasLimit && spent > limit;
              const remainingCat = Math.max(0, limit - spent);
              const catDailyAllowance =
                hasLimit && remainingCat > 0
                  ? remainingCat / monthPace.daysLeft
                  : 0;

              return (
                <div
                  key={cat.id}
                  className="bg-[#111216] border border-[#1e2026] hover:border-[#262830] transition-colors rounded-2xl p-4 space-y-3 shadow-sm"
                >
                  {/* Category Title - Big & Bold Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <h4 className="text-base sm:text-lg font-bold text-[#e2e2e7] tracking-tight m-0">
                        {cat.name}
                      </h4>
                    </div>

                    {hasLimit && (
                      <span
                        className={`text-xs font-semibold font-mono px-2.5 py-0.5 rounded-full ${
                          isOver
                            ? "bg-[#2b1b1d] text-[#f2b8b5] border border-[#5c2429]"
                            : pct > 80
                              ? "bg-[#2a1f17] text-[#ffb787] border border-[#422e1e]"
                              : "bg-[#15241b] text-[#a8dab5] border border-[#223a2b]"
                        }`}
                      >
                        {pct}%
                      </span>
                    )}
                  </div>

                  {/* Amounts - Big, immediate readable figures */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#90929d]">
                      Monthly Spent / Target Limit
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-mono text-xl sm:text-2xl font-extrabold text-[#e2e2e7]">
                        {formatINR(spent)}
                      </span>
                      {hasLimit && (
                        <span className="font-mono text-sm text-[#90929d]">
                          / {formatINR(limit)}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasLimit ? (
                    <div className="space-y-1.5">
                      <div className="w-full bg-[#16171c] h-2.5 rounded-full overflow-hidden border border-[#23252c]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver
                              ? "bg-[#f2b8b5]"
                              : pct > 80
                                ? "bg-[#ffb787]"
                                : "bg-[#a8dab5]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        {isOver ? (
                          <span className="text-[#f2b8b5] flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Over by {formatINR(spent - limit)}
                          </span>
                        ) : (
                          <span className="text-[#a8dab5] font-medium flex items-center gap-1.5">
                            <span>{formatINR(remainingCat)} left</span>
                            <span className="text-[#90929d] font-mono text-[11px]">
                              (~{formatINR(catDailyAllowance)}/day allowance)
                            </span>
                          </span>
                        )}
                        <span className="text-[11px] text-[#90929d]">
                          {monthPace.daysLeft}d remaining
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#90929d] flex items-center justify-between pt-1 border-t border-[#1a1c22]">
                      <span>No monthly ceiling configured</span>
                      {onOpenSettings && (
                        <button
                          type="button"
                          onClick={onOpenSettings}
                          className="text-[#a8c7fa] hover:underline font-medium"
                        >
                          Set limit
                        </button>
                      )}
                    </div>
                  )}

                  {/* If Food & Dining, show Tea subcategory breakdown inside */}
                  {(cat.id === "cat_food" ||
                    cat.name.toLowerCase().includes("food")) &&
                    currentMonthSpending.teaSpend > 0 && (
                      <div className="pt-2 border-t border-[#1e2026] flex items-center justify-between text-xs">
                        <span className="text-[#90929d] flex items-center gap-1.5">
                          <Coffee className="h-3.5 w-3.5 text-[#ffb787]" />
                          <span>Tea subcategory:</span>
                        </span>
                        <span className="font-mono font-bold text-[#ffb787] text-sm">
                          {formatINR(currentMonthSpending.teaSpend)}
                        </span>
                      </div>
                    )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 4. Accounts & Credit Card Gauges (Redesigned Visual Hierarchy) */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#e2e2e7] m-0">
              Accounts &amp; Credit Cards
            </h3>
            <p className="text-xs text-[#90929d] mt-0.5">
              Liquid balances ({formatINR(totalLiquid)}) • Credit liability (
              {formatINR(totalCCDebt)})
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {accounts.map((acc) => {
            const isCC = acc.type === "credit_card";
            const limit = acc.creditLimit || 100000;
            const utilPct = isCC
              ? Math.min(100, Math.round(((acc.balance || 0) / limit) * 100))
              : 0;

            return (
              <div
                key={acc.id}
                className="bg-[#111216] border border-[#1e2026] hover:border-[#262830] transition-colors rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm"
              >
                {/* 1. Account Title & Icon (Prominent Header) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-[#23252c]"
                      style={{
                        backgroundColor: `${acc.color}18`,
                        color: acc.color,
                      }}
                    >
                      {getAccountIcon(acc.icon)}
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[#e2e2e7] tracking-tight m-0">
                        {acc.name}
                      </h4>
                      <div className="text-[11px] text-[#90929d] capitalize mt-0.5">
                        {acc.type.replace("_", " ")}
                        {acc.accountNumber && (
                          <span className="font-mono text-[#6c6e79] ml-1.5">
                            {acc.accountNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Amount - The BIGGEST immediate data to be understood */}
                <div className="pt-1">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[#90929d]">
                    {isCC ? "Outstanding CC Debt" : "Available Balance"}
                  </div>
                  <div
                    className={`font-mono text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight ${
                      isCC
                        ? "text-[#f2b8b5]"
                        : (acc.balance || 0) > 0
                          ? "text-[#a8dab5]"
                          : "text-[#e2e2e7]"
                    }`}
                  >
                    {isCC ? "-" : ""}
                    {formatINR(acc.balance || 0)}
                  </div>
                </div>

                {/* 3. CC Limit Meter */}
                {isCC && (
                  <div className="space-y-1.5 pt-2 border-t border-[#1c1d22]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#c4c6cf]">Limit: {formatINR(limit)}</span>
                      <span className={utilPct > 70 ? "text-[#f2b8b5] font-semibold" : "text-[#90929d]"}>
                        {utilPct}% used
                      </span>
                    </div>
                    <div className="w-full bg-[#16171c] h-2 rounded-full overflow-hidden border border-[#23252c]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          utilPct > 70 ? "bg-[#f2b8b5]" : "bg-[#ffb787]"
                        }`}
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
