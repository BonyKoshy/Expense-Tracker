import { useState, useId } from 'react';
import {
  X,
  CreditCard,
  ArrowRightLeft,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  AlertCircle,
  CheckCircle,
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
  // Selected participants: 'user' + person IDs
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([
    'user',
    ...people.slice(0, 3).map((p) => p.id),
  ]);
  // Custom split amounts map
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  // Settlement specific
  const [settlementPersonId, setSettlementPersonId] = useState<string>(
    people[0]?.id || ''
  );

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = parseFloat(amountStr) || 0;

  // Filter subcategories for selected category
  const availableSubcategories = subcategories.filter(
    (s) => s.categoryId === categoryId
  );

  // When group is changed, auto-select members of that group + user
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

  // Calculate splits
  const computeSplits = (): { splits: TransactionSplit[]; userShare: number } => {
    const splits: TransactionSplit[] = [];

    if (splitMode === 'equal') {
      const count = selectedParticipants.length;
      if (count === 0 || totalAmount <= 0) return { splits: [], userShare: 0 };

      // Split equally, rounding cents cleanly
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
      // Exact custom amounts
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
      } else if (type === 'settlement_received') {
        finalPersonalExpense = 0; // ZERO expense/income!
        finalSplits = [
          { personId: settlementPersonId, amount: totalAmount, isSettled: true },
        ];
      } else if (type === 'settlement_paid') {
        finalPersonalExpense = 0; // ZERO expense/income!
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
        accountId: type === 'settlement_received' ? accountId : accountId,
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

      // Reset form & close
      setTitle('');
      setAmountStr('');
      setNotes('');
      setTagsStr('');
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Add Transaction
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Universal financial ledger with Cashew Killer split math
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Selector Pills */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('shared_expense')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'shared_expense'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-900/20'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Shared Split</span>
              </button>

              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'expense'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Personal Expense</span>
              </button>

              <button
                type="button"
                onClick={() => setType('settlement_received')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'settlement_received'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Settlement Received</span>
              </button>

              <button
                type="button"
                onClick={() => setType('settlement_paid')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'settlement_paid'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Settlement Paid</span>
              </button>

              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'transfer'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span>Account Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit_card_payment')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === 'credit_card_payment'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span>CC Bill Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition-all col-span-2 ${
                  type === 'income'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Personal Income (Salary/Rewards)</span>
              </button>
            </div>
          </div>

          {/* Core Fields: Title & Total Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Description / Merchant
              </label>
              <input
                type="text"
                required
                placeholder={
                  type === 'shared_expense'
                    ? 'e.g., DMart PG Groceries or Friday Dinner'
                    : type === 'settlement_received'
                    ? 'e.g., Sneha GPay settlement for DMart'
                    : 'e.g., Chai Point or Netflix'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Total Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1505.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Accounts & Categories Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                {type === 'settlement_received'
                  ? 'Deposit into Account'
                  : type === 'transfer' || type === 'credit_card_payment'
                  ? 'From Account (Source)'
                  : 'Paid From Account'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  To Account (Destination)
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Subcategory (Optional)
                  </label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {type === 'settlement_received'
                    ? 'Friend Repaying You'
                    : 'Friend You Are Repaying'}
                </label>
                <select
                  value={settlementPersonId}
                  onChange={(e) => setSettlementPersonId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Net balance:{' '}
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
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* THE CORE SHARED EXPENSE SPLIT ENGINE UI (Cashew Killer)   */}
          {/* ======================================================== */}
          {type === 'shared_expense' && (
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">
                    Split Configuration
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Group:</span>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">No Group (Ad-hoc Friends)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberIds.length} members)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Who Paid Full Bill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Who Paid the Bill?
                  </label>
                  <select
                    value={paidByPersonId}
                    onChange={(e) => setPaidByPersonId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="user">Me (I paid with my card/account)</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Friend paid on my behalf)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Split Method
                  </label>
                  <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        splitMode === 'equal'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('exact')}
                      className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                        splitMode === 'exact'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Exact (₹)
                    </button>
                  </div>
                </div>
              </div>

              {/* Participants Selection & Amount Allocation */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Select Participants &amp; Shares
                </label>
                <div className="space-y-2">
                  {/* User Entry */}
                  <ParticipantRow
                    id="user"
                    name="Me (Your personal expense)"
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

                  {/* Friends Entries */}
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
              </div>

              {/* Real-time Math Summary Callout */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-slate-400">
                    Your Personal Expense Impact:
                  </div>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    {formatINR(calculatedUserShare)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-slate-400">
                    {paidByPersonId === 'user'
                      ? 'Receivables From Friends:'
                      : 'Payable to Payer:'}
                  </div>
                  <div className="text-base font-bold text-amber-400 font-mono">
                    {formatINR(totalAmount - calculatedUserShare)}
                  </div>
                </div>
              </div>

              {splitMode === 'exact' && Math.abs(splitDifference) > 0.01 && (
                <div className="text-xs text-rose-400 font-mono">
                  Remaining unallocated: {formatINR(splitDifference)}
                </div>
              )}
            </div>
          )}

          {/* Settlement Clarification Callout */}
          {type === 'settlement_received' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <strong className="text-white block">
                  Pure Balance Transfer (Zero Income)
                </strong>
                This transaction increases your bank balance by {formatINR(totalAmount)} and directly reduces the selected friend&apos;s debt. It will not be falsely counted as taxable or monthly income.
              </div>
            </div>
          )}

          {type === 'settlement_paid' && (
            <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs flex items-start gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
              <div>
                <strong className="text-white block">
                  Debt Settlement (Zero Expense)
                </strong>
                This transaction reduces your bank balance by {formatINR(totalAmount)} and clears your payable balance to the friend. It will not inflate your monthly spending budget.
              </div>
            </div>
          )}

          {/* Notes & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes or context"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="pg, groceries, gpay"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
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
      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
        isSelected
          ? 'bg-slate-900 border-indigo-500/40 text-white'
          : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
      }`}
    >
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={onToggle}>
        <input
          type="checkbox"
          id={inputId}
          checked={isSelected}
          onChange={onToggle}
          className="rounded border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-slate-950 h-4 w-4"
        />
        <span className="text-base select-none">{avatar}</span>
        <label htmlFor={inputId} className="text-xs font-semibold select-none cursor-pointer">
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
              className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <span className="text-xs font-bold text-amber-400 font-mono">
              {formatINR(shareAmount)}
            </span>
          )
        ) : (
          <span className="text-xs text-slate-600 font-mono">Excluded</span>
        )}
      </div>
    </div>
  );
}
