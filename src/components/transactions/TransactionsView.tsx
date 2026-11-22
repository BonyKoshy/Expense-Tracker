import { useState, useMemo, useRef } from "react";
import {
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type {
  Transaction,
  Account,
  Category,
  Subcategory,
  Group,
  Person,
} from "@/types";
import { formatINR, formatDate } from "@/utils/formatters";

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  groups: Group[];
  people: Person[];
  onDeleteTx: (id: string) => void;
  onNewTx?: () => void;
}

interface MonthGroup {
  key: string; // "2026-11"
  label: string; // "November 2026"
  year: number;
  month: number;
  transactions: Transaction[];
  personalSpend: number;
  totalSwiped: number;
  totalIncome: number;
  settlementsReceived: number;
}

export function TransactionsView({
  transactions,
  accounts,
  categories = [],
  subcategories = [],
  groups,
  people,
  onDeleteTx,
  onNewTx,
}: TransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group transactions by YYYY-MM
  const monthGroups: MonthGroup[] = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    for (const tx of transactions) {
      const date = new Date(tx.date);
      const key = !isNaN(date.getTime())
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : "unknown";

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    }

    // Sort keys ascending: previous/earlier month on left side, newer on right!
    const sortedKeys = Array.from(map.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    return sortedKeys.map((key) => {
      const txs = map.get(key)!;
      let label = "Other";
      let year = 0;
      let month = 0;

      if (key !== "unknown") {
        const [y, m] = key.split("-").map(Number);
        year = y;
        month = m;
        const d = new Date(year, month - 1, 1);
        label = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }

      let personalSpend = 0;
      let totalSwiped = 0;
      let totalIncome = 0;
      let settlementsReceived = 0;

      for (const tx of txs) {
        if (tx.type === "expense") {
          personalSpend += tx.personalExpenseAmount || tx.amount || 0;
          totalSwiped += tx.amount || 0;
        } else if (tx.type === "shared_expense") {
          personalSpend += tx.personalExpenseAmount || 0;
          // Only count under total swiped if the user actually paid/swiped the bill
          if (!tx.paidByPersonId || tx.paidByPersonId === "user") {
            totalSwiped += tx.amount || 0;
          }
        } else if (tx.type === "income") {
          totalIncome += tx.amount || 0;
        } else if (tx.type === "settlement_received") {
          settlementsReceived += tx.amount || 0;
        }
      }

      return {
        key,
        label,
        year,
        month,
        transactions: txs,
        personalSpend,
        totalSwiped,
        totalIncome,
        settlementsReceived,
      };
    });
  }, [transactions]);

  const [activeMonthKey, setActiveMonthKey] = useState<string>(
    monthGroups[monthGroups.length - 1]?.key || monthGroups[0]?.key || "",
  );

  const currentMonthIndex = useMemo(() => {
    const idx = monthGroups.findIndex((m) => m.key === activeMonthKey);
    return idx >= 0 ? idx : monthGroups.length - 1;
  }, [monthGroups, activeMonthKey]);

  // Scroll to a specific month column
  const scrollToMonth = (key: string) => {
    setActiveMonthKey(key);
    const element = document.getElementById(`month-card-${key}`);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      const prevKey = monthGroups[currentMonthIndex - 1].key;
      scrollToMonth(prevKey);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex >= 0 && currentMonthIndex < monthGroups.length - 1) {
      const nextKey = monthGroups[currentMonthIndex + 1].key;
      scrollToMonth(nextKey);
    }
  };

  // Filter transactions within each month
  const filterTxs = (txs: Transaction[]) => {
    return txs.filter((tx) => {
      if (selectedType !== "all" && tx.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchNote = tx.notes?.toLowerCase().includes(q);
        const matchTag = tx.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchNote && !matchTag) return false;
      }
      return true;
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-8 text-center space-y-3">
        <div className="h-12 w-12 rounded-2xl bg-[#1a1c22] border border-[#262830] text-[#a8c7fa] flex items-center justify-center mx-auto">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-[#e2e2e7]">
          No Transactions Recorded
        </h3>
        <p className="text-xs text-[#90929d] max-w-sm mx-auto">
          Record your first expense, shared PG bill, or GPay settlement using
          the button below.
        </p>
        {onNewTx && (
          <button
            type="button"
            onClick={onNewTx}
            className="px-5 py-2.5 rounded-full bg-[#a8c7fa] text-[#062e6f] text-xs font-semibold hover:bg-[#b8d4ff] transition-colors"
          >
            Add Transaction
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls: Month Traverser, Title List & Filters */}
      <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month Traversal with Calendar Icon & Title */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentMonthIndex <= 0}
              className="h-9 w-9 rounded-full bg-[#111216] hover:bg-[#1a1c22] disabled:opacity-30 disabled:pointer-events-none text-[#c4c6cf] hover:text-[#e2e2e7] flex items-center justify-center border border-[#23252c] transition-colors shrink-0"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Calendar icon with month selector */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a2536] text-[#d3e3fd] text-xs font-semibold border border-[#2e405b] hover:bg-[#223147] transition-colors cursor-pointer min-h-[38px]">
                <Calendar className="h-4 w-4 text-[#a8c7fa]" />
                <span>
                  {monthGroups[currentMonthIndex]?.label || "Select Month"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a3560] text-[#a8c7fa]">
                  {monthGroups[currentMonthIndex]?.transactions.length || 0}
                </span>
              </div>

              {/* Native select over it for 1-tap fast traversal */}
              <select
                value={activeMonthKey}
                onChange={(e) => scrollToMonth(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select Month"
              >
                {monthGroups.map((mg) => (
                  <option
                    key={mg.key}
                    value={mg.key}
                    className="bg-[#16171c] text-[#e2e2e7]"
                  >
                    {mg.label} ({mg.transactions.length} entries)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={
                currentMonthIndex < 0 ||
                currentMonthIndex >= monthGroups.length - 1
              }
              className="h-9 w-9 rounded-full bg-[#111216] hover:bg-[#1a1c22] disabled:opacity-30 disabled:pointer-events-none text-[#c4c6cf] hover:text-[#e2e2e7] flex items-center justify-center border border-[#23252c] transition-colors shrink-0"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Month title list indicator */}
            <div className="hidden md:flex items-center gap-1.5 pl-2 text-xs text-[#90929d] border-l border-[#23252c]">
              {monthGroups.map((mg, i) => (
                <button
                  key={mg.key}
                  type="button"
                  onClick={() => scrollToMonth(mg.key)}
                  className={`text-[11px] transition-colors hover:text-[#e2e2e7] ${
                    activeMonthKey === mg.key
                      ? "text-[#a8c7fa] font-semibold underline underline-offset-4"
                      : "text-[#90929d]"
                  }`}
                >
                  {mg.label.split(" ")[0]}
                  {i < monthGroups.length - 1 ? " •" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#90929d]" />
            <input
              type="text"
              placeholder="Search transactions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#e2e2e7] placeholder-[#90929d] focus:outline-none min-h-[40px]"
            />
          </div>
        </div>

        {/* Type Filter Pills: All smaller as just All */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedType === "all"
                ? "bg-[#1a2536] text-[#d3e3fd] border border-[#2e405b]"
                : "bg-[#111216] text-[#90929d] hover:text-[#e2e2e7] border border-[#23252c]"
            }`}
          >
            All
          </button>
          {[
            { id: "shared_expense", label: "Shared Splits" },
            { id: "expense", label: "Personal" },
            { id: "settlement_received", label: "Settlements" },
            { id: "income", label: "Inflow" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedType(tab.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedType === tab.id
                  ? "bg-[#1a2536] text-[#d3e3fd] border border-[#2e405b]"
                  : "bg-[#111216] text-[#90929d] hover:text-[#e2e2e7] border border-[#23252c]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Horizontally Scrollable Month Sections Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-1 px-0.5 scrollbar-thin"
        style={{ scrollBehavior: "smooth" }}
      >
        {monthGroups.map((mg) => {
          const filteredTxs = filterTxs(mg.transactions);

          return (
            <div
              key={mg.key}
              id={`month-card-${mg.key}`}
              className="snap-center shrink-0 w-full md:w-[480px] lg:w-[520px] bg-[#16171c] border border-[#23252c] rounded-[28px] overflow-hidden flex flex-col shadow-lg"
            >
              {/* Month Card Header */}
              <div className="p-4 sm:p-5 border-b border-[#23252c] bg-[#1a1c22] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#e2e2e7] m-0">
                      {mg.label}
                    </h3>
                    <p className="text-xs text-[#90929d] mt-0.5">
                      {filteredTxs.length} of {mg.transactions.length}{" "}
                      transactions
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#111216] border border-[#23252c] text-[#a8c7fa]">
                    {mg.key}
                  </span>
                </div>

                {/* Monthly Financial Summary Chips */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-2xl bg-[#111216] border border-[#1e2026]">
                    <div className="text-[11px] text-[#90929d]">
                      Personal Spend
                    </div>
                    <div className="text-sm font-semibold text-[#f2b8b5] font-mono mt-0.5">
                      {formatINR(mg.personalSpend)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-[#111216] border border-[#1e2026]">
                    <div className="text-[11px] text-[#90929d]">
                      Total Swiped / Billed
                    </div>
                    <div className="text-sm font-semibold text-[#e2e2e7] font-mono mt-0.5">
                      {formatINR(mg.totalSwiped)}
                    </div>
                  </div>

                  {mg.totalIncome > 0 && (
                    <div className="p-2.5 rounded-2xl bg-[#111216] border border-[#1e2026]">
                      <div className="text-[11px] text-[#90929d]">
                        Income / Inflow
                      </div>
                      <div className="text-sm font-semibold text-[#a8dab5] font-mono mt-0.5">
                        +{formatINR(mg.totalIncome)}
                      </div>
                    </div>
                  )}

                  {mg.settlementsReceived > 0 && (
                    <div className="p-2.5 rounded-2xl bg-[#111216] border border-[#1e2026]">
                      <div className="text-[11px] text-[#90929d]">
                        Settlements Recovered
                      </div>
                      <div className="text-sm font-semibold text-[#a8dab5] font-mono mt-0.5">
                        +{formatINR(mg.settlementsReceived)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Month Transactions List */}
              <div className="divide-y divide-[#1c1d22] overflow-y-auto max-h-[580px] flex-1">
                {filteredTxs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#90929d]">
                    No transactions match current search criteria for {mg.label}
                    .
                  </div>
                ) : (
                  filteredTxs.map((tx) => {
                    const account = accounts.find((a) => a.id === tx.accountId);
                    const category = categories.find(
                      (c) => c.id === tx.categoryId,
                    );
                    const subcategory = subcategories.find(
                      (s) => s.id === tx.subcategoryId,
                    );
                    const isShared = tx.type === "shared_expense";
                    const isSettlement = tx.type === "settlement_received";
                    const isIncome = tx.type === "income";
                    const isCCPay = tx.type === "credit_card_payment";

                    // Find friend who settled if settlement
                    const friend = people.find(
                      (p) =>
                        p.id === tx.paidByPersonId ||
                        p.id === tx.splits?.[0]?.personId,
                    );

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 hover:bg-[#1a1c22]/60 transition-colors flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-2xl shrink-0 mt-0.5 border ${
                              isShared
                                ? "bg-[#2a1f17] text-[#ffb787] border-[#422e1e]"
                                : isSettlement
                                  ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                                  : isIncome
                                    ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                                    : isCCPay
                                      ? "bg-[#1a2536] text-[#a8c7fa] border-[#2e405b]"
                                      : "bg-[#1a1c22] text-[#a8c7fa] border-[#262830]"
                            }`}
                          >
                            {isShared ? (
                              <Users className="h-4 w-4" />
                            ) : isSettlement || isIncome ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : isCCPay ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-[#e2e2e7] text-xs sm:text-sm">
                                {tx.title}
                              </span>

                              {/* Vibrant Category Badge */}
                              {category && (
                                <span
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{
                                    backgroundColor: `${category.color}20`,
                                    color: category.color,
                                    borderColor: `${category.color}45`,
                                    borderWidth: 1,
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <span>{category.name}</span>
                                  {subcategory && (
                                    <span className="opacity-75 font-normal">
                                      › {subcategory.name}
                                    </span>
                                  )}
                                </span>
                              )}

                              {isShared && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#422e1e]">
                                  Split
                                </span>
                              )}

                              {isSettlement && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#15241b] text-[#a8dab5] border border-[#223a2b]">
                                  Settlement
                                </span>
                              )}

                              {tx.groupId && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#2e405b]">
                                  {groups.find((g) => g.id === tx.groupId)
                                    ?.name || tx.groupId}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#90929d]">
                              <span>{formatDate(tx.date)}</span>
                              <span>•</span>
                              {isShared &&
                              tx.paidByPersonId &&
                              tx.paidByPersonId !== "user" ? (
                                <span className="text-[#ffb787] font-medium">
                                  Paid by{" "}
                                  {people.find(
                                    (p) => p.id === tx.paidByPersonId,
                                  )?.name || "Friend"}
                                </span>
                              ) : (
                                <span className="text-[#c4c6cf]">
                                  {account?.name || "Account"}
                                </span>
                              )}
                              {friend && isSettlement && (
                                <>
                                  <span>•</span>
                                  <span className="text-[#a8dab5]">
                                    From {friend.name}
                                  </span>
                                </>
                              )}
                            </div>

                            {tx.notes && (
                              <p className="text-[11px] text-[#90929d] italic line-clamp-2 leading-relaxed">
                                {tx.notes}
                              </p>
                            )}

                            {/* Shared Split Details Badge */}
                            {isShared && tx.splits && tx.splits.length > 1 && (
                              <div className="pt-0.5 flex flex-wrap gap-1 text-[10px]">
                                <span className="text-[#90929d]">
                                  Personal:{" "}
                                  {formatINR(tx.personalExpenseAmount)} •
                                  Friends:
                                </span>
                                {tx.splits
                                  .filter((s) => s.personId !== "user")
                                  .map((s) => {
                                    const pName =
                                      people.find((p) => p.id === s.personId)
                                        ?.name || "Friend";
                                    return (
                                      <span
                                        key={s.personId}
                                        className={`px-1.5 py-0.2 rounded border ${
                                          s.isSettled
                                            ? "bg-[#15241b] text-[#a8dab5] border-[#223a2b]"
                                            : "bg-[#2a1f17] text-[#ffb787] border-[#422e1e]"
                                        }`}
                                      >
                                        {pName}: {formatINR(s.amount)} (
                                        {s.isSettled ? "paid" : "due"})
                                      </span>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono text-xs sm:text-sm font-semibold ${
                              isIncome || isSettlement
                                ? "text-[#a8dab5]"
                                : isShared
                                  ? "text-[#ffb787]"
                                  : "text-[#e2e2e7]"
                            }`}
                          >
                            {isIncome || isSettlement ? "+" : "-"}
                            {formatINR(tx.amount)}
                          </div>

                          {isShared &&
                            tx.personalExpenseAmount !== tx.amount && (
                              <div className="text-[10px] text-[#90929d] font-mono mt-0.5">
                                My Share: {formatINR(tx.personalExpenseAmount)}
                              </div>
                            )}

                          <button
                            type="button"
                            onClick={() => onDeleteTx(tx.id)}
                            className="mt-1 text-[#90929d] hover:text-[#f2b8b5] transition-colors p-1 opacity-60 group-hover:opacity-100"
                            title="Delete transaction and revert balances"
                          >
                            <Trash2 className="h-3.5 w-3.5 ml-auto" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
