import { useState, useMemo } from 'react';
import {
  PiggyBank,
  Target,
  Landmark,
  Plus,
  Check,
  SlidersHorizontal,
  Wallet,
  CreditCard,
  Banknote,
  X,
  Layers,
  ArrowDownLeft,
} from 'lucide-react';
import type { Account, Category, Transaction } from '@/types';
import { formatINR } from '@/utils/formatters';

interface SavingsGoalCardProps {
  accounts?: Account[];
  categories?: Category[];
  transactions?: Transaction[];
  savingsBalance?: number;
  canaraBalance?: number;
  totalInvestments?: number;
  onQuickTransferToSavings?: () => void;
}

export function SavingsGoalCard({
  accounts = [],
  categories = [],
  transactions = [],
  savingsBalance = 0,
  canaraBalance = 0,
  totalInvestments = 0,
  onQuickTransferToSavings,
}: SavingsGoalCardProps) {
  // Tracking Mode: 'accounts' (balance of selected accounts) or 'transactions' (sum of transactions in savings category)
  const [trackingMode, setTrackingMode] = useState<'accounts' | 'transactions'>(() => {
    try {
      return (
        (localStorage.getItem('fintrack_savings_mode') as 'accounts' | 'transactions') ||
        'accounts'
      );
    } catch {
      return 'accounts';
    }
  });

  const [savingsTarget, setSavingsTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fintrack_savings_target');
      return saved ? Number(saved) : 50000;
    } catch {
      return 50000;
    }
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fintrack_savings_cat_id');
      if (saved) return saved;
    } catch {
      // ignore
    }
    const defaultCat = categories.find(
      (c) =>
        c.id === 'cat_investments' ||
        c.name.toLowerCase().includes('saving') ||
        c.name.toLowerCase().includes('invest')
    );
    return defaultCat ? defaultCat.id : 'cat_investments';
  });

  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('fintrack_savings_acc_ids');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    // Auto-select accounts matching canara or investment type
    const defaultIds = accounts
      .filter(
        (a) =>
          !a.isArchived &&
          (a.name.toLowerCase().includes('canara') ||
            a.type === 'investment' ||
            a.name.toLowerCase().includes('saving') ||
            a.name.toLowerCase().includes('rd'))
      )
      .map((a) => a.id);
    return defaultIds.length > 0 ? defaultIds : [];
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
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

  const isCategoryMode = trackingMode === 'transactions';

  // Category mode calculation: sum of all transactions under selected category
  const targetCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const categoryTxs = useMemo(() => {
    return transactions.filter((t) => t.categoryId === selectedCategoryId);
  }, [transactions, selectedCategoryId]);

  const categorySavingsTotal = useMemo(() => {
    return categoryTxs.reduce((sum, t) => {
      if (t.type === 'income') {
        return sum + (t.amount || 0);
      }
      return sum + (t.personalExpenseAmount || t.amount || 0);
    }, 0);
  }, [categoryTxs]);

  const currentMonthCategorySavings = useMemo(() => {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return categoryTxs
      .filter((t) => t.date && t.date.slice(0, 7) === curMonth)
      .reduce((sum, t) => sum + (t.personalExpenseAmount || t.amount || 0), 0);
  }, [categoryTxs]);

  // Account mode calculation: sum of balances of selected accounts
  const activeSelectedAccounts = useMemo(() => {
    if (selectedAccountIds.length === 0) {
      const matching = accounts.filter(
        (a) =>
          !a.isArchived &&
          (a.name.toLowerCase().includes('canara') ||
            a.type === 'investment' ||
            a.name.toLowerCase().includes('saving'))
      );
      return matching.length > 0 ? matching : accounts.slice(0, 1);
    }
    return accounts.filter((a) => selectedAccountIds.includes(a.id));
  }, [accounts, selectedAccountIds]);

  const accountSavingsTotal = useMemo(() => {
    if (activeSelectedAccounts.length === 0) {
      return savingsBalance || 0;
    }
    return activeSelectedAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [activeSelectedAccounts, savingsBalance]);

  // Effective Savings Balance depending on mode
  const effectiveSavingsBalance = isCategoryMode ? categorySavingsTotal : accountSavingsTotal;
  const progressPct = Math.min(
    100,
    Math.round((effectiveSavingsBalance / (savingsTarget || 1)) * 100)
  );

  const handleToggleAccount = (id: string) => {
    const next = selectedAccountIds.includes(id)
      ? selectedAccountIds.filter((x) => x !== id)
      : [...selectedAccountIds, id];
    setSelectedAccountIds(next);
    try {
      localStorage.setItem('fintrack_savings_acc_ids', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleModeChange = (mode: 'accounts' | 'transactions') => {
    setTrackingMode(mode);
    try {
      localStorage.setItem('fintrack_savings_mode', mode);
    } catch {
      // ignore
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    try {
      localStorage.setItem('fintrack_savings_cat_id', catId);
    } catch {
      // ignore
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4 text-[#f2b8b5]" />;
      case 'cash':
        return <Banknote className="h-4 w-4 text-[#a8dab5]" />;
      case 'wallet':
        return <Wallet className="h-4 w-4 text-[#ffb787]" />;
      case 'investment':
        return <PiggyBank className="h-4 w-4 text-[#d0bcff]" />;
      default:
        return <Landmark className="h-4 w-4 text-[#9fd5cb]" />;
    }
  };

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
              {isCategoryMode
                ? `Tracked via transactions in ${targetCategory?.name || 'Investments & Savings'}`
                : activeSelectedAccounts.length > 0
                ? `Accumulated in ${activeSelectedAccounts.map((a) => a.name).join(' & ')}`
                : 'Accumulated in Canara Bank & RD investments'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Customize Mode & Accounts Button */}
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="px-2.5 py-1.5 rounded-full bg-[#1a1c22] hover:bg-[#202228] text-xs font-medium text-[#c4c6cf] border border-[#262830] flex items-center gap-1.5 transition-colors"
            title="Customize Tracking Source"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#a8dab5]" />
            <span>Customize</span>
          </button>

          {/* Quick Target Editor */}
          {isEditingTarget ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Target"
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
              {formatINR(effectiveSavingsBalance)}
            </span>
            <span className="text-xs text-[#90929d]">
              saved of {formatINR(savingsTarget)} goal
            </span>
          </div>

          <span className="text-xs text-[#a8dab5] font-medium">
            {formatINR(Math.max(0, savingsTarget - effectiveSavingsBalance))} remaining
          </span>
        </div>

        <div className="w-full bg-[#111216] h-2 rounded-full overflow-hidden border border-[#1e2026]">
          <div
            className="bg-[#a8dab5] h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Dynamic Breakdown Chips */}
      {isCategoryMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-[#a8dab5]" />
              <div>
                <div className="text-[#e2e2e7] font-medium">This Month Deposits</div>
                <div className="text-[10px] text-[#90929d]">
                  Saved in {targetCategory?.name || 'Category'}
                </div>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-[#a8dab5]">
              +{formatINR(currentMonthCategorySavings)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#d0bcff]" />
              <div>
                <div className="text-[#e2e2e7] font-medium">All-Time Cumulative</div>
                <div className="text-[10px] text-[#90929d]">
                  {categoryTxs.length} savings transaction(s) logged
                </div>
              </div>
            </div>
            <span className="font-mono text-sm font-semibold text-[#e2e2e7]">
              {formatINR(categorySavingsTotal)}
            </span>
          </div>
        </div>
      ) : activeSelectedAccounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          {activeSelectedAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-3 rounded-2xl bg-[#111216] border border-[#1e2026] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {getAccountIcon(acc.type)}
                <div>
                  <div className="text-[#e2e2e7] font-medium">{acc.name}</div>
                  <div className="text-[10px] text-[#90929d]">
                    {acc.institution || acc.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold text-[#e2e2e7]">
                {formatINR(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      ) : (
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
      )}

      {/* Customization Modal Sheet */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-150">
            <div className="flex items-center justify-between border-b border-[#23252c] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#15241b] text-[#a8dab5] border border-[#22382a]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e2e2e7] m-0">
                    Customize Savings Tracker
                  </h3>
                  <p className="text-[11px] text-[#90929d]">
                    Choose how your savings and emergency goal are measured
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="p-1 rounded-full text-[#90929d] hover:text-[#e2e2e7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tracking Mode Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#c4c6cf] block">
                Tracking Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('accounts')}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    !isCategoryMode
                      ? 'bg-[#1a2536] border-[#a8c7fa] text-[#d3e3fd]'
                      : 'bg-[#111216] border-[#23252c] text-[#90929d] hover:text-[#e2e2e7]'
                  }`}
                >
                  <div className="font-semibold text-xs">Account Balances</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    Tracks balance of selected savings accounts
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('transactions')}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    isCategoryMode
                      ? 'bg-[#15241b] border-[#a8dab5] text-[#a8dab5]'
                      : 'bg-[#111216] border-[#23252c] text-[#90929d] hover:text-[#e2e2e7]'
                  }`}
                >
                  <div className="font-semibold text-xs">Category Deposits</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    Tracks transactions in Savings category
                  </div>
                </button>
              </div>
            </div>

            {/* Sub-options based on mode */}
            {isCategoryMode ? (
              <div className="space-y-2 bg-[#111216] border border-[#23252c] rounded-2xl p-3.5">
                <label className="text-xs font-medium text-[#c4c6cf] block">
                  Select Savings &amp; Investment Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-[#16171c] border border-[#23252c] focus:border-[#a8c7fa] rounded-xl px-3 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                >
                  {categories
                    .filter((c) => c.type === 'expense' || c.type === 'both')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-[#90929d] pt-1">
                  Every transaction recorded under this category will automatically increase your
                  savings progress.
                </p>
              </div>
            ) : (
              <div className="space-y-2 bg-[#111216] border border-[#23252c] rounded-2xl p-3.5">
                <label className="text-xs font-medium text-[#c4c6cf] block">
                  Select Accounts to Count Toward Savings
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {accounts.map((acc) => {
                    const isChecked = selectedAccountIds.includes(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#16171c] hover:bg-[#1a1c22] cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAccount(acc.id)}
                            className="rounded border-[#23252c] text-[#a8c7fa] bg-[#111216]"
                          />
                          <span className="font-medium text-[#e2e2e7]">{acc.name}</span>
                          <span className="text-[10px] text-[#90929d]">({acc.type})</span>
                        </div>
                        <span className="font-mono text-[#a8dab5]">{formatINR(acc.balance)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Target Goal Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#c4c6cf] block">
                Savings Target Goal (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder="Target amount"
                className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm font-mono text-[#e2e2e7] focus:outline-none min-h-[46px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleSaveTarget();
                  setIsCustomizeOpen(false);
                }}
                className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] font-semibold text-xs transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
