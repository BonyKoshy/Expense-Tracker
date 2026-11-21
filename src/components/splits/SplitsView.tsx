import { Users, ArrowDownLeft } from 'lucide-react';
import type { Group, Person } from '../../types';
import { formatINR } from '../../utils/formatters';

interface SplitsViewProps {
  groups: Group[];
  people: Person[];
  totalReceivables: number;
  onOpenPeople: () => void;
  onSimulateSettlement: (personId: string, personName: string, amount: number) => void;
}

export function SplitsView({
  groups,
  people,
  totalReceivables,
  onOpenPeople,
  onSimulateSettlement,
}: SplitsViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <span className="text-xs text-[#90929d]">
          PG Flatmates &amp; Asynchronous Debt Clearance
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPeople}
            className="px-3.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-medium text-[#e2e2e7] border border-[#262830] flex items-center gap-1.5 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Manage Friends</span>
          </button>
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#2a1f17] text-[#ffb787] border border-[#3d2c20]">
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
                <span className="text-sm font-semibold text-[#e2e2e7]">{grp.name}</span>
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
        <div className="px-5 py-4 border-b border-[#23252c]">
          <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">Friends Ledger</h3>
          <p className="text-xs text-[#90929d] mt-0.5">
            Tap &quot;Settle via GPay&quot; to test instant receivable reduction into HDFC
            Salary
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
                  <div className="h-10 w-10 rounded-2xl bg-[#1a2536] flex items-center justify-center text-lg shrink-0 border border-[#262830]">
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
                          <span className="font-mono text-[#a8c7fa]">{p.upiId}</span>
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
                      type="button"
                      onClick={() => onSimulateSettlement(p.id, p.name, p.netBalance)}
                      className="px-3.5 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1c2e22] text-[#a8dab5] text-xs font-semibold border border-[#22382a] transition-colors flex items-center gap-1.5"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                      <span>Settle via GPay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
