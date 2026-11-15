import { useState } from 'react';
import { PiggyBank, Target, Landmark, Plus, Check } from 'lucide-react';
import { formatINR } from '@/utils/formatters';

interface SavingsGoalCardProps {
  savingsBalance: number; // Canara Bank + RD
  canaraBalance: number;
  totalInvestments: number; // RD
  onQuickTransferToSavings?: () => void;
}

export function SavingsGoalCard({
  savingsBalance,
  canaraBalance,
  totalInvestments,
  onQuickTransferToSavings,
}: SavingsGoalCardProps) {
  const [savingsTarget, setSavingsTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fintrack_savings_target');
      return saved ? Number(saved) : 50000;
    } catch {
      return 50000;
    }
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(savingsTarget));

  const handleSaveTarget = () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      setSavingsTarget(val);
      try {
        localStorage.setItem('fintrack_savings_target', String(val));
      } catch {
        // ignore
      }
    }
    setIsEditingTarget(false);
  };

  const progressPct = Math.min(100, Math.round((savingsBalance / savingsTarget) * 100));

  return (
    <div className="bg-[#16171c] border border-[#23252c] rounded-[28px] p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#15241b] text-[#a8dab5] flex items-center justify-center shrink-0 border border-[#22382a]">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                Savings &amp; Emergency Buffer
              </h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#15241b] text-[#a8dab5] border border-[#22382a]">
                {progressPct}% of Goal
              </span>
            </div>
            <p className="text-xs text-[#90929d] mt-0.5">
              Accumulated in Canara Bank &amp; ICCSL Recurring Deposit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditingTarget ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Target ₹"
                className="w-24 bg-[#111216] border border-[#a8c7fa] rounded-full px-3 py-1 text-xs text-[#e2e2e7] focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleSaveTarget}
                className="h-7 w-7 rounded-full bg-[#a8c7fa] text-[#0d2238] flex items-center justify-center hover:bg-[#b8d4ff] transition-colors"
                title="Save target"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetInput(String(savingsTarget));
                setIsEditingTarget(true);
              }}
              className="px-3 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-medium text-[#c4c6cf] border border-[#262830] flex items-center gap-1.5 transition-colors"
            >
              <Target className="h-3.5 w-3.5 text-[#a8dab5]" />
              <span>Target: {formatINR(savingsTarget)}</span>
            </button>
          )}

          {onQuickTransferToSavings && (
            <button
              type="button"
              onClick={onQuickTransferToSavings}
              className="px-3 py-1.5 rounded-full bg-[#15241b] hover:bg-[#1c2e22] text-xs font-medium text-[#a8dab5] border border-[#22382a] flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add to Savings</span>
            </button>
          )}
        </div>
      </div>

      {/* Big Savings Metric & Progress Bar */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold font-mono text-[#e2e2e7]">
              {formatINR(savingsBalance)}
            </span>
            <span className="text-xs text-[#90929d]">
              saved of {formatINR(savingsTarget)} goal
            </span>
          </div>

          <span className="text-xs text-[#a8dab5] font-medium">
            {formatINR(Math.max(0, savingsTarget - savingsBalance))} remaining
          </span>
        </div>

        <div className="w-full bg-[#111216] h-2 rounded-full overflow-hidden border border-[#1e2026]">
          <div
            className="bg-[#a8dab5] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Savings Breakdown Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
        <div className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-[#9fd5cb]" />
            <div>
              <div className="text-[#e2e2e7] font-medium">CANARA Bank</div>
              <div className="text-[10px] text-[#90929d]">Savings &amp; Emergency Buffer</div>
            </div>
          </div>
          <span className="font-mono text-sm font-semibold text-[#e2e2e7]">
            {formatINR(canaraBalance)}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-[#d0bcff]" />
            <div>
              <div className="text-[#e2e2e7] font-medium">ICCSL RD</div>
              <div className="text-[10px] text-[#90929d]">Recurring Deposit Investment</div>
            </div>
          </div>
          <span className="font-mono text-sm font-semibold text-[#e2e2e7]">
            {formatINR(totalInvestments)}
          </span>
        </div>
      </div>
    </div>
  );
}
