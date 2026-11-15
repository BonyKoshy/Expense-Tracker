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

  const totalAmount = parseFloat(amountStr) || 0;

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#1e2026] border border-[#2d3139] rounded-t-[28px] sm:rounded-[28px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        {/* Android 17 Bottom Sheet Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-[#44474f] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#2d3139] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#282a30] text-[#a8c7fa] border border-[#33353c]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e9] m-0">
                New Transaction
              </h2>
              <p className="text-xs text-[#8e9099] mt-0.5">
                Splits, settlements, or personal spending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6d0] hover:text-[#e2e2e9] hover:bg-[#282a30] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-[#371e1d] border border-[#60201f] text-[#ffb4ab] text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#ffb4ab]" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Selector Chips */}
          <div>
            <label className="text-xs font-medium text-[#c4c6d0] block mb-2">
              Transaction Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setType('shared_expense')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  type === 'shared_expense'
                    ? 'bg-[#253a5c] text-[#d3e3fd]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    ? 'bg-[#253a5c] text-[#d3e3fd]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    ? 'bg-[#1e2a22] text-[#a8dab5]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    ? 'bg-[#253a5c] text-[#d3e3fd]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    ? 'bg-[#253a5c] text-[#d3e3fd]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
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
                    ? 'bg-[#1e2a22] text-[#a8dab5]'
                    : 'bg-[#282a30] text-[#c4c6d0] hover:bg-[#33353c]'
                }`}
              >
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span>Income</span>
              </button>
            </div>
          </div>

          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                Description
              </label>
              <input
                type="text"
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
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-4 py-2.5 text-sm text-[#e2e2e9] placeholder-[#8e9099] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1505.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-4 py-2.5 text-sm text-[#e2e2e9] font-mono placeholder-[#8e9099] focus:outline-none"
              />
            </div>
          </div>

          {/* Accounts & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                {type === 'settlement_received'
                  ? 'Deposit into'
                  : type === 'transfer' || type === 'credit_card_payment'
                  ? 'From Account'
                  : 'Paid from'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
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
                <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                  To Account
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
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
                <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                  }}
                  className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
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
                  <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                    Subcategory
                  </label>
                  <select
                    value={subcategoryId}
                    onChange={(e) => setSubcategoryId(e.target.value)}
                    className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
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
                <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                  {type === 'settlement_received'
                    ? 'Friend Repaying'
                    : 'Friend You Are Repaying'}
                </label>
                <select
                  value={settlementPersonId}
                  onChange={(e) => setSettlementPersonId(e.target.value)}
                  className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
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
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2.5 text-xs text-[#e2e2e9] focus:outline-none"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* SHARED EXPENSE SPLIT CONFIGURATION                        */}
          {/* ======================================================== */}
          {type === 'shared_expense' && (
            <div className="bg-[#191b20] border border-[#2d3139] rounded-[24px] p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2d3139] pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#ffb77c]" />
                  <span className="text-xs font-semibold text-[#e2e2e9]">
                    Split Options
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8e9099]">Group:</span>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="bg-[#111318] border border-[#44474f] rounded-xl px-2.5 py-1 text-xs text-[#e2e2e9] focus:outline-none"
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
                  <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                    Who Paid?
                  </label>
                  <select
                    value={paidByPersonId}
                    onChange={(e) => setPaidByPersonId(e.target.value)}
                    className="w-full bg-[#111318] border border-[#44474f] rounded-xl px-3 py-2 text-xs text-[#e2e2e9] focus:outline-none"
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
                  <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                    Split Type
                  </label>
                  <div className="flex rounded-xl bg-[#111318] p-1 border border-[#282a30]">
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                        splitMode === 'equal'
                          ? 'bg-[#253a5c] text-[#d3e3fd]'
                          : 'text-[#8e9099] hover:text-[#e2e2e9]'
                      }`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('exact')}
                      className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                        splitMode === 'exact'
                          ? 'bg-[#253a5c] text-[#d3e3fd]'
                          : 'text-[#8e9099] hover:text-[#e2e2e9]'
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
              <div className="bg-[#111318] border border-[#282a30] rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[#8e9099]">Personal Share:</div>
                  <div className="text-sm font-semibold text-[#a8dab5] font-mono">
                    {formatINR(calculatedUserShare)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[#8e9099]">
                    {paidByPersonId === 'user' ? 'Friend Receivables:' : 'Payable to Friend:'}
                  </div>
                  <div className="text-sm font-semibold text-[#ffb77c] font-mono">
                    {formatINR(totalAmount - calculatedUserShare)}
                  </div>
                </div>
              </div>

              {splitMode === 'exact' && Math.abs(splitDifference) > 0.01 && (
                <div className="text-xs text-[#ffb4ab] font-mono">
                  Unallocated difference: {formatINR(splitDifference)}
                </div>
              )}
            </div>
          )}

          {/* Settlement Clarification */}
          {type === 'settlement_received' && (
            <div className="p-3.5 rounded-2xl bg-[#1e2a22] border border-[#2e4d38] text-[#a8dab5] text-xs flex items-start gap-2.5">
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
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e9] placeholder-[#8e9099] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#c4c6d0] block mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="pg, groceries, gpay"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                className="w-full bg-[#111318] border border-[#44474f] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e9] placeholder-[#8e9099] focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-[#2d3139] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full text-xs font-medium text-[#c4c6d0] hover:bg-[#282a30] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] active:scale-95 text-[#003062] text-xs font-semibold shadow-md transition-all"
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
      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
        isSelected
          ? 'bg-[#1e2026] border-[#33353c] text-[#e2e2e9]'
          : 'bg-[#191b20] border-transparent text-[#8e9099]'
      }`}
    >
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={onToggle}>
        <input
          type="checkbox"
          id={inputId}
          checked={isSelected}
          onChange={onToggle}
          className="rounded border-[#44474f] text-[#a8c7fa] bg-[#111318] h-4 w-4"
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
              className="w-24 bg-[#111318] border border-[#44474f] rounded-xl px-2.5 py-1 text-xs text-right text-[#e2e2e9] font-mono focus:outline-none focus:border-[#a8c7fa]"
            />
          ) : (
            <span className="text-xs font-semibold text-[#ffb77c] font-mono">
              {formatINR(shareAmount)}
            </span>
          )
        ) : (
          <span className="text-xs text-[#8e9099] font-mono">Excluded</span>
        )}
      </div>
    </div>
  );
}
