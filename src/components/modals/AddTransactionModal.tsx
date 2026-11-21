import { useState, useEffect, useId, useCallback } from 'react';
import {
  X,
  CreditCard,
  ArrowRightLeft,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Calculator,
  ArrowRight,
  ArrowLeft,
  Delete,
} from 'lucide-react';
import type {
  Account,
  Category,
  Subcategory,
  Person,
  Group,
  Transaction,
  TransactionType,
  SplitMode,
  TransactionSplit,
} from '@/types';
import { recordTransaction } from '@/services/accountingEngine';
import { db } from '@/db';
import { formatINR } from '@/utils/formatters';
import { evaluateExpression, handleKeypadInput } from '@/utils/calculator';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  people: Person[];
  groups: Group[];
  onSuccess?: (msg: string) => void;
}

export function AddTransactionModal({
  isOpen,
  onClose,
  accounts,
  categories,
  subcategories,
  people,
  groups,
  onSuccess,
}: AddTransactionModalProps) {
  // Two-step flow: 1. Calculator / Amount Entry -> 2. Transaction Details
  const [step, setStep] = useState<'calculator' | 'details'>('calculator');
  const [calcExpr, setCalcExpr] = useState('0');

  // Transaction Configuration State
  const [type, setType] = useState<TransactionType>('shared_expense');
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [tagsStr, setTagsStr] = useState('');

  // Shared Expense Specific State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [paidByPersonId, setPaidByPersonId] = useState<string>('user');
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([
    'user',
    ...people.slice(0, 3).map((p) => p.id),
  ]);
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [settlementPersonId, setSettlementPersonId] = useState<string>(
    people[0]?.id || ''
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Evaluate calculation in real-time
  const evaluatedAmount = evaluateExpression(calcExpr);
  const totalAmount = parseFloat(amountStr) || evaluatedAmount || 0;

  // Whenever modal opens, reset to calculator step
  useEffect(() => {
    if (isOpen) {
      setStep('calculator');
      setCalcExpr(amountStr && parseFloat(amountStr) > 0 ? amountStr : '0');
      setError(null);
    }
  }, [isOpen, amountStr]);

  const handleClose = useCallback(() => {
    setStep('calculator');
    setCalcExpr('0');
    setTitle('');
    setAmountStr('');
    setNotes('');
    setTagsStr('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleKeypad = useCallback((key: string) => {
    setError(null);
    setCalcExpr((prev) => handleKeypadInput(prev, key));
  }, []);

  const goToDetailsStep = useCallback(() => {
    const finalVal = evaluateExpression(calcExpr);
    if (finalVal <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    setAmountStr(finalVal.toString());
    setStep('details');
    setError(null);
  }, [calcExpr]);

  // Keyboard support for desktop / hardware typing when in calculator mode
  useEffect(() => {
    if (!isOpen || step !== 'calculator') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an actual input is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        goToDetailsStep();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeypad('⌫');
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleKeypad('C');
        return;
      }

      if (e.key === '=') {
        e.preventDefault();
        handleKeypad('=');
        return;
      }

      if (
        /^[0-9]$/.test(e.key) ||
        e.key === '.' ||
        e.key === '+' ||
        e.key === '-' ||
        e.key === '*' ||
        e.key === '/'
      ) {
        e.preventDefault();
        handleKeypad(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, handleClose, goToDetailsStep, handleKeypad]);

  const availableSubcategories = subcategories.filter(
    (s) => s.categoryId === categoryId
  );

  const handleGroupChange = (grpId: string) => {
    setSelectedGroupId(grpId);
    if (!grpId) {
      setSelectedParticipants(['user', ...people.map((p) => p.id)]);
      return;
    }
    const grp = groups.find((g) => g.id === grpId);
    if (grp) {
      setSelectedParticipants(['user', ...grp.memberIds]);
    }
  };

  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length <= 1) {
        setError('At least one participant must be selected.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((p) => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
    setError(null);
  };

  const computeSplits = (): { splits: TransactionSplit[]; userShare: number } => {
    const splits: TransactionSplit[] = [];

    if (splitMode === 'equal') {
      const count = selectedParticipants.length;
      if (count === 0 || totalAmount <= 0) return { splits: [], userShare: 0 };

      const baseShare = Math.floor((totalAmount / count) * 100) / 100;
      let remainder = Math.round((totalAmount - baseShare * count) * 100) / 100;

      for (const id of selectedParticipants) {
        let share = baseShare;
        if (remainder > 0.001) {
          share = Math.round((share + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        splits.push({
          personId: id,
          amount: share,
          isSettled: id === paidByPersonId,
        });
      }
    } else {
      for (const id of selectedParticipants) {
        const val = parseFloat(customSplits[id] || '0') || 0;
        splits.push({
          personId: id,
          amount: val,
          isSettled: id === paidByPersonId,
        });
      }
    }

    const userSplit = splits.find((s) => s.personId === 'user');
    const userShare = userSplit ? userSplit.amount : 0;
    return { splits, userShare };
  };

  const { splits: calculatedSplits, userShare: calculatedUserShare } =
    computeSplits();
  const splitsSum = calculatedSplits.reduce((s, item) => s + item.amount, 0);
  const splitDifference = Math.round((totalAmount - splitsSum) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title or description.');
      return;
    }

    if (type === 'shared_expense') {
      if (splitMode !== 'equal' && Math.abs(splitDifference) > 0.01) {
        setError(
          `The sum of split amounts (${formatINR(splitsSum)}) must equal the total bill (${formatINR(totalAmount)}). Difference: ${formatINR(splitDifference)}`
        );
        return;
      }
    }

    if (type === 'transfer' && accountId === toAccountId) {
      setError('Source and destination accounts must be different for transfers.');
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let finalPersonalExpense = 0;
      let finalSplits: TransactionSplit[] = [];

      if (type === 'shared_expense') {
        finalPersonalExpense = calculatedUserShare;
        finalSplits = calculatedSplits;
      } else if (type === 'expense') {
        finalPersonalExpense = totalAmount;
        finalSplits = [{ personId: 'user', amount: totalAmount, isSettled: true }];
      } else if (type === 'settlement_received' || type === 'settlement_paid') {
        finalPersonalExpense = 0; // Pure debt clearance: zero income or expense
        finalSplits = [
          { personId: settlementPersonId, amount: totalAmount, isSettled: true },
        ];
      }

      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        title: title.trim(),
        date: new Date(date).toISOString(),
        amount: totalAmount,
        accountId: accountId,
        toAccountId:
          type === 'transfer' || type === 'credit_card_payment'
            ? toAccountId
            : undefined,
        categoryId:
          type === 'expense' || type === 'shared_expense' ? categoryId : undefined,
        subcategoryId:
          type === 'expense' || type === 'shared_expense'
            ? subcategoryId || undefined
            : undefined,
        personalExpenseAmount: finalPersonalExpense,
        isShared: type === 'shared_expense',
        groupId:
          type === 'shared_expense' && selectedGroupId
            ? selectedGroupId
            : undefined,
        paidByPersonId:
          type === 'shared_expense'
            ? paidByPersonId
            : type === 'settlement_received'
            ? settlementPersonId
            : 'user',
        splits: finalSplits,
        notes: notes.trim() || undefined,
        tags: tags.length ? tags : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await recordTransaction(db, tx);

      if (onSuccess) {
        onSuccess(
          type === 'shared_expense'
            ? `Shared expense logged: ₹${totalAmount.toFixed(2)} total, personal share ₹${finalPersonalExpense.toFixed(2)}.`
            : type === 'settlement_received'
            ? `Settlement recorded: ₹${totalAmount.toFixed(2)} received without impacting income.`
            : `Transaction "${tx.title}" recorded successfully.`
        );
      }

      handleClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        {/* Android 17 Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-[#23252c] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#23252c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'details' ? (
              <button
                type="button"
                onClick={() => {
                  setCalcExpr(amountStr || '0');
                  setStep('calculator');
                }}
                className="p-2 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] text-[#a8c7fa] border border-[#262830] transition-colors"
                title="Back to Calculator"
                aria-label="Back to Calculator"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="p-2 rounded-2xl bg-[#1a1c22] text-[#a8c7fa] border border-[#262830]">
                <Calculator className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                {step === 'calculator' ? 'Enter Amount' : 'Transaction Details'}
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                {step === 'calculator'
                  ? 'Calculate amount directly or enter total'
                  : 'Categorize, split, and record'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6cf] hover:text-[#e2e2e7] hover:bg-[#1a1c22] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: CALCULATOR VIEW */}
        {step === 'calculator' && (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {error && (
              <div className="p-3 rounded-2xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#f2b8b5]" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Transaction Type Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#c4c6cf]">
                  Transaction Type
                </label>
                <span className="text-[11px] text-[#90929d]">Step 1 of 2</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setType('shared_expense')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'shared_expense'
                      ? 'bg-[#1a2536] text-[#d3e3fd] border border-[#263750]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Shared Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'expense'
                      ? 'bg-[#1a2536] text-[#d3e3fd] border border-[#263750]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Personal Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('settlement_received')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'settlement_received'
                      ? 'bg-[#15241b] text-[#a8dab5] border border-[#22382a]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Settlement</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('transfer')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'transfer'
                      ? 'bg-[#1a2536] text-[#d3e3fd] border border-[#263750]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('credit_card_payment')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'credit_card_payment'
                      ? 'bg-[#1a2536] text-[#d3e3fd] border border-[#263750]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>CC Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'income'
                      ? 'bg-[#15241b] text-[#a8dab5] border border-[#22382a]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830] border border-transparent'
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Income</span>
                </button>
              </div>
            </div>

            {/* Calculator Display Screen */}
            <div className="bg-[#111216] border border-[#23252c] rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-h-[110px] shadow-inner">
              {/* Live Formula / Calculation Line */}
              <div className="text-right text-xs sm:text-sm font-mono text-[#90929d] min-h-[1.25rem] truncate select-all">
                {calcExpr !== '0' &&
                (calcExpr.includes('+') ||
                  calcExpr.includes('-') ||
                  calcExpr.includes('×') ||
                  calcExpr.includes('÷')) ? (
                  <span className="flex items-center justify-end gap-1.5">
                    <span>{calcExpr}</span>
                    <span className="text-[#a8c7fa]">=</span>
                  </span>
                ) : (
                  <span className="text-[11px] uppercase tracking-wider text-[#90929d]/70 font-sans font-medium">
                    Tap numbers or calculate
                  </span>
                )}
              </div>

              {/* Evaluated Total Amount Display */}
              <div className="flex items-baseline justify-end gap-1.5 mt-1 overflow-x-auto no-scrollbar">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#a8c7fa] select-none">
                  ₹
                </span>
                <span
                  className={`text-3xl sm:text-4xl font-bold font-mono tracking-tight select-all ${
                    evaluatedAmount > 0 ? 'text-[#e2e2e7]' : 'text-[#90929d]'
                  }`}
                >
                  {evaluatedAmount > 0
                    ? evaluatedAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: calcExpr.includes('.') ? 2 : 0,
                        maximumFractionDigits: 2,
                      })
                    : '0'}
                </span>
              </div>
            </div>

            {/* Quick Presets Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] text-[#90929d] uppercase font-semibold shrink-0 mr-1">
                Quick Add:
              </span>
              {[50, 100, 200, 500, 1000, 2000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleKeypad(`+${preset}`)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#c4c6cf] hover:text-[#e2e2e7] text-xs font-mono font-medium border border-[#23252c] transition-all"
                >
                  +₹{preset}
                </button>
              ))}
            </div>

            {/* Tactile Material 3 Keypad Grid */}
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 select-none">
              {/* Row 1: Clear, Divide, Multiply, Backspace */}
              <button
                type="button"
                onClick={() => handleKeypad('C')}
                className="h-12 sm:h-14 rounded-2xl bg-[#2b1b1d] hover:bg-[#3d2427] active:scale-95 text-[#f2b8b5] font-semibold text-base border border-[#48282b] flex items-center justify-center transition-all shadow-sm"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('÷')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a2536] hover:bg-[#22334a] active:scale-95 text-[#a8c7fa] font-semibold text-xl border border-[#263750] flex items-center justify-center transition-all shadow-sm"
              >
                ÷
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('×')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a2536] hover:bg-[#22334a] active:scale-95 text-[#a8c7fa] font-semibold text-xl border border-[#263750] flex items-center justify-center transition-all shadow-sm"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('⌫')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#c4c6cf] font-medium border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
                aria-label="Backspace"
              >
                <Delete className="h-5 w-5" />
              </button>

              {/* Row 2: 7, 8, 9, Minus */}
              <button
                type="button"
                onClick={() => handleKeypad('7')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('8')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('9')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('-')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a2536] hover:bg-[#22334a] active:scale-95 text-[#a8c7fa] font-semibold text-2xl border border-[#263750] flex items-center justify-center transition-all shadow-sm"
              >
                −
              </button>

              {/* Row 3: 4, 5, 6, Plus */}
              <button
                type="button"
                onClick={() => handleKeypad('4')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('5')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('6')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('+')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a2536] hover:bg-[#22334a] active:scale-95 text-[#a8c7fa] font-semibold text-2xl border border-[#263750] flex items-center justify-center transition-all shadow-sm"
              >
                +
              </button>

              {/* Row 4: 1, 2, 3, Decimal */}
              <button
                type="button"
                onClick={() => handleKeypad('1')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('2')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('3')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('.')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-bold text-2xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                .
              </button>

              {/* Row 5: 00, 0, Equals (Col-span-2) */}
              <button
                type="button"
                onClick={() => handleKeypad('00')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-lg border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                00
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('0')}
                className="h-12 sm:h-14 rounded-2xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#e2e2e7] font-medium text-xl border border-[#23252c] flex items-center justify-center transition-all shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeypad('=')}
                className="col-span-2 h-12 sm:h-14 rounded-2xl bg-[#a8c7fa] hover:bg-[#b8d4ff] active:scale-95 text-[#003062] font-bold text-2xl flex items-center justify-center transition-all shadow-md"
              >
                =
              </button>
            </div>

            {/* Next Action Button */}
            <div className="pt-1">
              <button
                type="button"
                disabled={evaluatedAmount <= 0}
                onClick={goToDetailsStep}
                className={`w-full py-3.5 px-5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                  evaluatedAmount > 0
                    ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] cursor-pointer'
                    : 'bg-[#1a1c22] text-[#60636d] border border-[#23252c] cursor-not-allowed'
                }`}
              >
                <span>
                  {evaluatedAmount > 0
                    ? `Next: Add Details (${formatINR(evaluatedAmount)})`
                    : 'Enter an amount to continue'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TRANSACTION DETAILS VIEW */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-[#f2b8b5]" />
                <span>{error}</span>
              </div>
            )}

            {/* Calculated Amount Hero Summary Card */}
            <div className="bg-[#111216] border border-[#23252c] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#1a2536] text-[#a8c7fa] border border-[#263750]">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#90929d]">
                    Calculated Amount
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-[#a8c7fa]">
                    {formatINR(totalAmount)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCalcExpr(amountStr || '0');
                  setStep('calculator');
                }}
                className="px-3.5 py-2 rounded-xl bg-[#1a1c22] hover:bg-[#262830] active:scale-95 text-[#c4c6cf] hover:text-[#e2e2e7] text-xs font-medium border border-[#23252c] flex items-center gap-1.5 transition-all"
                title="Recalculate or edit amount in calculator"
              >
                <Calculator className="h-3.5 w-3.5 text-[#a8c7fa]" />
                <span>Recalculate</span>
              </button>
            </div>

            {/* Transaction Type Selector Chips */}
            <div>
              <label className="text-xs font-medium text-[#c4c6cf] block mb-2">
                Transaction Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setType('shared_expense')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'shared_expense'
                      ? 'bg-[#1a2536] text-[#d3e3fd]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Shared Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'expense'
                      ? 'bg-[#1a2536] text-[#d3e3fd]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Personal Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('settlement_received')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'settlement_received'
                      ? 'bg-[#15241b] text-[#a8dab5]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Settlement Received</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('settlement_paid')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'settlement_paid'
                      ? 'bg-[#3b2d18] text-[#ffb77c]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Settlement Paid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('transfer')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'transfer'
                      ? 'bg-[#1a2536] text-[#d3e3fd]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Transfer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('credit_card_payment')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'credit_card_payment'
                      ? 'bg-[#1a2536] text-[#d3e3fd]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>CC Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    type === 'income'
                      ? 'bg-[#15241b] text-[#a8dab5]'
                      : 'bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#262830]'
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Income</span>
                </button>
              </div>
            </div>

            {/* Description & Amount Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder={
                    type === 'shared_expense'
                      ? 'e.g., DMart PG Groceries'
                      : type === 'settlement_received'
                      ? 'e.g., Rahul GPay repayment'
                      : 'e.g., Chai Point'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-2.5 text-sm text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#c4c6cf]">
                    Amount (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcExpr(amountStr || '0');
                      setStep('calculator');
                    }}
                    className="text-[11px] text-[#a8c7fa] hover:underline flex items-center gap-1 font-medium"
                  >
                    <Calculator className="h-3 w-3" />
                    <span>Calc</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="1505.00"
                  value={amountStr}
                  onChange={(e) => {
                    setAmountStr(e.target.value);
                    setCalcExpr(e.target.value);
                  }}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-2.5 text-sm text-[#e2e2e7] font-mono placeholder-[#90929d] focus:outline-none"
                />
              </div>
            </div>

            {/* Accounts & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  {type === 'settlement_received'
                    ? 'Deposit into'
                    : type === 'transfer' || type === 'credit_card_payment'
                    ? 'From Account'
                    : 'Paid from'}
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatINR(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {(type === 'transfer' || type === 'credit_card_payment') && (
                <div>
                  <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                    To Account
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatINR(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(type === 'expense' || type === 'shared_expense') && (
                <div>
                  <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setSubcategoryId('');
                    }}
                    className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(type === 'expense' || type === 'shared_expense') &&
                availableSubcategories.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Subcategory
                    </label>
                    <select
                      value={subcategoryId}
                      onChange={(e) => setSubcategoryId(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                    >
                      <option value="">-- General --</option>
                      {availableSubcategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {(type === 'settlement_received' || type === 'settlement_paid') && (
                <div>
                  <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                    {type === 'settlement_received'
                      ? 'Friend Repaying'
                      : 'Friend You Are Repaying'}
                  </label>
                  <select
                    value={settlementPersonId}
                    onChange={(e) => setSettlementPersonId(e.target.value)}
                    className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Balance:{' '}
                        {p.netBalance > 0
                          ? `Owes you ₹${p.netBalance}`
                          : p.netBalance < 0
                          ? `You owe ₹${Math.abs(p.netBalance)}`
                          : 'Settled ₹0'}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e7] focus:outline-none"
                />
              </div>
            </div>

            {/* SHARED EXPENSE SPLIT CONFIGURATION */}
            {type === 'shared_expense' && (
              <div className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23252c] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#ffb77c]" />
                    <span className="text-xs font-semibold text-[#e2e2e7]">
                      Split Options
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#90929d]">Group:</span>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="bg-[#111216] border border-[#23252c] rounded-xl px-2.5 py-1 text-xs text-[#e2e2e7] focus:outline-none"
                    >
                      <option value="">No Group (Ad-hoc)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Payer and Split Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Who Paid?
                    </label>
                    <select
                      value={paidByPersonId}
                      onChange={(e) => setPaidByPersonId(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] rounded-xl px-3 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    >
                      <option value="user">Me (I swiped the bill)</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Friend paid for me)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Split Type
                    </label>
                    <div className="flex rounded-xl bg-[#111216] p-1 border border-[#1a1c22]">
                      <button
                        type="button"
                        onClick={() => setSplitMode('equal')}
                        className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                          splitMode === 'equal'
                            ? 'bg-[#1a2536] text-[#d3e3fd]'
                            : 'text-[#90929d] hover:text-[#e2e2e7]'
                        }`}
                      >
                        Equal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode('exact')}
                        className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                          splitMode === 'exact'
                            ? 'bg-[#1a2536] text-[#d3e3fd]'
                            : 'text-[#90929d] hover:text-[#e2e2e7]'
                        }`}
                      >
                        Exact (₹)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div className="space-y-2">
                  <ParticipantRow
                    id="user"
                    name="My Personal Share"
                    avatar="👤"
                    isSelected={selectedParticipants.includes('user')}
                    onToggle={() => toggleParticipant('user')}
                    isSplitModeExact={splitMode === 'exact'}
                    shareAmount={
                      splitMode === 'equal'
                        ? calculatedUserShare
                        : parseFloat(customSplits['user'] || '0')
                    }
                    onCustomAmountChange={(val) =>
                      setCustomSplits({ ...customSplits, user: val })
                    }
                  />

                  {people.map((p) => {
                    const isSelected = selectedParticipants.includes(p.id);
                    const friendShare =
                      splitMode === 'equal'
                        ? calculatedSplits.find((s) => s.personId === p.id)?.amount || 0
                        : parseFloat(customSplits[p.id] || '0');

                    return (
                      <ParticipantRow
                        key={p.id}
                        id={p.id}
                        name={p.name}
                        avatar={p.avatar || '👤'}
                        isSelected={isSelected}
                        onToggle={() => toggleParticipant(p.id)}
                        isSplitModeExact={splitMode === 'exact'}
                        shareAmount={friendShare}
                        onCustomAmountChange={(val) =>
                          setCustomSplits({ ...customSplits, [p.id]: val })
                        }
                      />
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="bg-[#111216] border border-[#1a1c22] rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[#90929d]">Personal Share:</div>
                    <div className="text-sm font-semibold text-[#a8dab5] font-mono">
                      {formatINR(calculatedUserShare)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[#90929d]">
                      {paidByPersonId === 'user' ? 'Friend Receivables:' : 'Payable to Friend:'}
                    </div>
                    <div className="text-sm font-semibold text-[#ffb77c] font-mono">
                      {formatINR(totalAmount - calculatedUserShare)}
                    </div>
                  </div>
                </div>

                {splitMode === 'exact' && Math.abs(splitDifference) > 0.01 && (
                  <div className="text-xs text-[#f2b8b5] font-mono">
                    Unallocated difference: {formatINR(splitDifference)}
                  </div>
                )}
              </div>
            )}

            {/* Settlement Clarification */}
            {type === 'settlement_received' && (
              <div className="p-3.5 rounded-2xl bg-[#15241b] border border-[#22382a] text-[#a8dab5] text-xs flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#a8dab5] mt-0.5" />
                <div>
                  <strong>Asset Transfer (Zero Income):</strong> Liquid account balance increases and friend debt reduces. No artificial income is created.
                </div>
              </div>
            )}

            {type === 'settlement_paid' && (
              <div className="p-3.5 rounded-2xl bg-[#3b2d18] border border-[#5a4220] text-[#ffb77c] text-xs flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 text-[#ffb77c] mt-0.5" />
                <div>
                  <strong>Debt Repayment (Zero Expense):</strong> Outflow settles payable balance to the friend without inflating your expense budgets.
                </div>
              </div>
            )}

            {/* Notes & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="pg, groceries, gpay"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] placeholder-[#90929d] focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#23252c] flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCalcExpr(amountStr || '0');
                  setStep('calculator');
                }}
                className="px-4 py-2.5 rounded-full text-xs font-medium text-[#c4c6cf] hover:bg-[#1a1c22] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Calculator</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#c4c6cf] hover:bg-[#1a1c22] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] active:scale-95 text-[#003062] text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Record Transaction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ParticipantRowProps {
  id: string;
  name: string;
  avatar: string;
  isSelected: boolean;
  onToggle: () => void;
  isSplitModeExact: boolean;
  shareAmount: number;
  onCustomAmountChange: (val: string) => void;
}

function ParticipantRow({
  name,
  avatar,
  isSelected,
  onToggle,
  isSplitModeExact,
  shareAmount,
  onCustomAmountChange,
}: ParticipantRowProps) {
  const inputId = useId();

  return (
    <div
      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
        isSelected
          ? 'bg-[#16171c] border-[#262830] text-[#e2e2e7]'
          : 'bg-[#111216] border-transparent text-[#90929d]'
      }`}
    >
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={onToggle}>
        <input
          type="checkbox"
          id={inputId}
          checked={isSelected}
          onChange={onToggle}
          className="rounded border-[#23252c] text-[#a8c7fa] bg-[#111216] h-4 w-4"
        />
        <span className="text-base select-none">{avatar}</span>
        <label htmlFor={inputId} className="text-xs font-medium select-none cursor-pointer">
          {name}
        </label>
      </div>

      <div>
        {isSelected ? (
          isSplitModeExact ? (
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={shareAmount || ''}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              className="w-24 bg-[#111216] border border-[#23252c] rounded-xl px-2.5 py-1 text-xs text-right text-[#e2e2e7] font-mono focus:outline-none focus:border-[#a8c7fa]"
            />
          ) : (
            <span className="text-xs font-semibold text-[#ffb77c] font-mono">
              {formatINR(shareAmount)}
            </span>
          )
        ) : (
          <span className="text-xs text-[#90929d] font-mono">Excluded</span>
        )}
      </div>
    </div>
  );
}
