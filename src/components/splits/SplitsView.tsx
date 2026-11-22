import { useState, useMemo } from "react";
import {
  Users,
  ArrowDownLeft,
  X,
  CheckCircle,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { Group, Person, Transaction } from "../../types";
import { formatINR, formatDate } from "../../utils/formatters";

interface SplitsViewProps {
  groups: Group[];
  people: Person[];
  transactions: Transaction[];
  totalReceivables: number;
  onOpenPeople: () => void;
  onSimulateSettlement: (
    personId: string,
    personName: string,
    amount: number,
  ) => void;
}

export function SplitsView({
  groups,
  people,
  transactions,
  totalReceivables,
  onOpenPeople,
  onSimulateSettlement,
}: SplitsViewProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<"pending" | "all">("pending");

  const selectedPerson = useMemo(() => {
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  // All shared expenses and settlements involving the selected person
  const personTransactions = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions.filter((tx) => {
      if (tx.type === "shared_expense") {
        return (
          tx.paidByPersonId === selectedPerson.id ||
          tx.splits?.some((s) => s.personId === selectedPerson.id)
        );
      }
      if (tx.type === "settlement_received" || tx.type === "settlement_paid") {
        return (
          tx.paidByPersonId === selectedPerson.id ||
          tx.splits?.some((s) => s.personId === selectedPerson.id)
        );
      }
      return false;
    });
  }, [transactions, selectedPerson]);

  // Extract pending (unsettled) split items for the selected person
  const pendingItems = useMemo(() => {
    if (!selectedPerson) return [];
    const items: {
      tx: Transaction;
      type: "receivable" | "payable";
      shareAmount: number;
      role: string;
    }[] = [];

    for (const tx of personTransactions) {
      if (tx.type === "shared_expense") {
        // Case 1: User paid the bill, friend has an unsettled split share
        if (!tx.paidByPersonId || tx.paidByPersonId === "user") {
          const split = tx.splits?.find(
            (s) => s.personId === selectedPerson.id,
          );
          if (split && !split.isSettled) {
            items.push({
              tx,
              type: "receivable",
              shareAmount: split.amount,
              role: "You swiped the bill",
            });
          }
        }
        // Case 2: Friend paid the bill, user has an unsettled split share
        else if (tx.paidByPersonId === selectedPerson.id) {
          const userSplit = tx.splits?.find((s) => s.personId === "user");
          const userShare = userSplit
            ? userSplit.amount
            : tx.personalExpenseAmount || 0;
          if (userSplit && !userSplit.isSettled) {
            items.push({
              tx,
              type: "payable",
              shareAmount: userShare,
              role: `${selectedPerson.name} swiped the bill`,
            });
          }
        }
      }
    }
    return items;
  }, [personTransactions, selectedPerson]);

  const pendingSum = useMemo(() => {
    return pendingItems.reduce((sum, item) => sum + item.shareAmount, 0);
  }, [pendingItems]);

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#e2e2e7] m-0">
            Shared Expenses &amp; Debt
          </h2>
          <p className="text-xs text-[#90929d] mt-0.5">
            Click any friend to inspect pending due transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPeople}
            className="px-4 py-2 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-semibold text-[#e2e2e7] border border-[#262830] flex items-center gap-1.5 transition-colors active:scale-95 min-h-[38px]"
          >
            <Users className="h-4 w-4" />
            <span>Manage Friends</span>
          </button>
          <span className="text-xs font-semibold px-3.5 py-2 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#3d2c20]">
            Receivables: {formatINR(totalReceivables)}
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
                <span className="text-sm font-semibold text-[#e2e2e7]">
                  {grp.name}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#283a54]">
                  Group
                </span>
              </div>
              {grp.description && (
                <p className="text-xs text-[#90929d] mt-1">{grp.description}</p>
              )}
              <div className="text-[11px] text-[#c4c6cf] mt-2">
                {grp.memberIds.length} members
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* People & Balances Ledger */}
      <div className="rounded-[28px] bg-[#16171c] border border-[#23252c] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#23252c] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
              Friends Ledger
            </h3>
            <p className="text-xs text-[#90929d] mt-0.5">
              Tap any friend card to view their itemized pending dues
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#1c1d22]">
          {people.map((p) => {
            const owesMe = p.netBalance > 0;
            const isSettled = p.netBalance === 0;

            return (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPersonId(p.id);
                  setViewFilter("pending");
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#1a1c22]/70 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#1a2536] flex items-center justify-center text-lg shrink-0 border border-[#262830]">
                    {p.avatar || "👤"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#e2e2e7] text-sm group-hover:text-[#a8c7fa] transition-colors">
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
                      <span>•</span>
                      <span className="text-[11px] text-[#a8c7fa]/80 underline decoration-[#a8c7fa]/30">
                        View itemized dues ›
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <div
                      className={`text-sm font-semibold font-mono ${
                        owesMe
                          ? "text-[#ffb787]"
                          : isSettled
                            ? "text-[#90929d]"
                            : "text-[#f2b8b5]"
                      }`}
                    >
                      {isSettled
                        ? "Settled (₹0)"
                        : owesMe
                          ? `Owes you ${formatINR(p.netBalance)}`
                          : `You owe ${formatINR(Math.abs(p.netBalance))}`}
                    </div>
                    <div className="text-[10px] text-[#90929d]">
                      {owesMe
                        ? "Receivable"
                        : isSettled
                          ? "Settled"
                          : "Payable"}
                    </div>
                  </div>

                  {owesMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSimulateSettlement(p.id, p.name, p.netBalance);
                      }}
                      className="px-4 py-2 rounded-full bg-[#15241b] hover:bg-[#1c2e22] text-[#a8dab5] text-xs font-semibold border border-[#22382a] transition-colors flex items-center gap-1.5 active:scale-95 min-h-[38px]"
                      title="Settle full balance via GPay"
                    >
                      <ArrowDownLeft className="h-4 w-4" />
                      <span>Settle via GPay</span>
                    </button>
                  )}

                  <ChevronRight className="h-4 w-4 text-[#90929d] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* PENDING DUE BREAKDOWN MODAL                                */}
      {/* ======================================================== */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-[#23252c] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#23252c] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[#1a2536] flex items-center justify-center text-lg border border-[#262830]">
                  {selectedPerson.avatar || "👤"}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                    {selectedPerson.name}
                  </h2>
                  <p className="text-xs text-[#90929d] mt-0.5">
                    Itemized Pending Due Breakdown
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6cf] hover:text-[#e2e2e7] hover:bg-[#1a1c22] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Due Balance Hero Card */}
              <div className="bg-[#111216] border border-[#23252c] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#90929d]">
                    Net Financial Balance
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span
                      className={`text-2xl sm:text-3xl font-bold font-mono ${
                        selectedPerson.netBalance > 0
                          ? "text-[#ffb787]"
                          : selectedPerson.netBalance < 0
                            ? "text-[#f2b8b5]"
                            : "text-[#a8dab5]"
                      }`}
                    >
                      {formatINR(Math.abs(selectedPerson.netBalance))}
                    </span>
                    <span className="text-xs font-medium text-[#c4c6cf]">
                      {selectedPerson.netBalance > 0
                        ? "Owed to you"
                        : selectedPerson.netBalance < 0
                          ? "You owe friend"
                          : "Fully Settled"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#90929d] mt-1">
                    {selectedPerson.netBalance > 0
                      ? "Total outstanding receivable across unpaid split purchases"
                      : selectedPerson.netBalance < 0
                        ? "Payable balance to be reimbursed to friend"
                        : "All past split purchases have been cleared"}
                  </p>
                </div>

                {selectedPerson.netBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSimulateSettlement(
                        selectedPerson.id,
                        selectedPerson.name,
                        selectedPerson.netBalance,
                      );
                      setSelectedPersonId(null);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#15241b] hover:bg-[#1d3224] text-[#a8dab5] text-xs font-semibold border border-[#22382a] flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>Settle {formatINR(selectedPerson.netBalance)}</span>
                  </button>
                )}
              </div>

              {/* View Filter Switcher */}
              <div className="flex items-center justify-between border-b border-[#23252c] pb-2">
                <div className="flex rounded-xl bg-[#111216] p-1 border border-[#1e2026]">
                  <button
                    type="button"
                    onClick={() => setViewFilter("pending")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewFilter === "pending"
                        ? "bg-[#1a2536] text-[#d3e3fd]"
                        : "text-[#90929d] hover:text-[#e2e2e7]"
                    }`}
                  >
                    Pending Due ({pendingItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewFilter === "all"
                        ? "bg-[#1a2536] text-[#d3e3fd]"
                        : "text-[#90929d] hover:text-[#e2e2e7]"
                    }`}
                  >
                    All History ({personTransactions.length})
                  </button>
                </div>

                <span className="text-[11px] text-[#90929d]">
                  {viewFilter === "pending"
                    ? `Sum: ${formatINR(pendingSum)}`
                    : `${personTransactions.length} records`}
                </span>
              </div>

              {/* VIEW 1: PENDING DUE ONLY (DEFAULT) */}
              {viewFilter === "pending" && (
                <div className="space-y-2.5">
                  {pendingItems.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#111216] border border-[#23252c] text-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#15241b] text-[#a8dab5] border border-[#22382a] mx-auto flex items-center justify-center">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-[#e2e2e7] m-0">
                        No Pending Due Transactions
                      </h4>
                      <p className="text-xs text-[#90929d] max-w-sm mx-auto">
                        All shared bills with {selectedPerson.name} are settled.
                        No outstanding shares remain unpaid.
                      </p>
                    </div>
                  ) : (
                    pendingItems.map(({ tx, shareAmount, role }) => {
                      const groupName = tx.groupId
                        ? groups.find((g) => g.id === tx.groupId)?.name
                        : null;

                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-[#111216] border border-[#23252c] hover:border-[#2e313b] flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-xs sm:text-sm text-[#e2e2e7]">
                                {tx.title}
                              </span>
                              {groupName && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd] border border-[#263750]">
                                  {groupName}
                                </span>
                              )}
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#422e1e] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Pending Due</span>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#90929d]">
                              <span>{formatDate(tx.date)}</span>
                              <span>•</span>
                              <span>Total Bill: {formatINR(tx.amount)}</span>
                              <span>•</span>
                              <span className="text-[#c4c6cf]">{role}</span>
                            </div>

                            {tx.notes && (
                              <p className="text-[11px] text-[#90929d] italic mt-0.5">
                                {tx.notes}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-bold font-mono text-[#ffb787]">
                              +{formatINR(shareAmount)}
                            </div>
                            <div className="text-[10px] text-[#90929d]">
                              Due Share
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {pendingItems.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[#1a1c22] border border-[#262830] flex items-center justify-between text-xs">
                      <span className="text-[#c4c6cf] font-medium">
                        Total Pending Unsettled Dues ({pendingItems.length}{" "}
                        items):
                      </span>
                      <span className="font-mono font-bold text-sm text-[#ffb787]">
                        {formatINR(pendingSum)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: ALL TRANSACTION HISTORY */}
              {viewFilter === "all" && (
                <div className="space-y-2.5">
                  {personTransactions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-[#111216] border border-[#23252c] text-center text-xs text-[#90929d]">
                      No transaction history found with this friend.
                    </div>
                  ) : (
                    personTransactions.map((tx) => {
                      const isSettlement =
                        tx.type === "settlement_received" ||
                        tx.type === "settlement_paid";
                      const isUserPayer =
                        !tx.paidByPersonId || tx.paidByPersonId === "user";
                      const split = tx.splits?.find(
                        (s) => s.personId === selectedPerson.id,
                      );
                      const isSettled = split ? split.isSettled : true;

                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-2xl bg-[#111216] border border-[#23252c] flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-xs sm:text-sm text-[#e2e2e7]">
                                {tx.title}
                              </span>
                              {isSettlement ? (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#15241b] text-[#a8dab5] border border-[#22382a]">
                                  Settlement
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    isSettled
                                      ? "bg-[#15241b] text-[#a8dab5] border-[#22382a]"
                                      : "bg-[#2a1f17] text-[#ffb787] border-[#422e1e]"
                                  }`}
                                >
                                  {isSettled ? "Settled" : "Pending Due"}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#90929d]">
                              <span>{formatDate(tx.date)}</span>
                              <span>•</span>
                              <span>
                                {isSettlement
                                  ? `Settlement: ${formatINR(tx.amount)}`
                                  : `Total Bill: ${formatINR(tx.amount)} (${
                                      isUserPayer
                                        ? "You paid"
                                        : `${selectedPerson.name} paid`
                                    })`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-xs sm:text-sm font-bold font-mono ${
                                isSettlement
                                  ? "text-[#a8dab5]"
                                  : isSettled
                                    ? "text-[#90929d]"
                                    : "text-[#ffb787]"
                              }`}
                            >
                              {split
                                ? formatINR(split.amount)
                                : formatINR(tx.amount)}
                            </div>
                            <div className="text-[10px] text-[#90929d]">
                              {isSettlement
                                ? "Settled"
                                : isSettled
                                  ? "Cleared"
                                  : "Unpaid"}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#23252c] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedPersonId(null)}
                className="px-5 py-2 rounded-full bg-[#1a1c22] hover:bg-[#262830] text-xs font-medium text-[#c4c6cf] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
