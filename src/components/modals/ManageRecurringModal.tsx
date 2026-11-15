import { useState } from 'react';
import { X, Plus, Repeat } from 'lucide-react';
import type {
  RecurringCommitment,
  RecurringCommitmentType,
  Account,
  Category,
} from '@/types';
import { db } from '@/db';
import { formatINR } from '@/utils/formatters';

interface ManageRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  recurringCommitments: RecurringCommitment[];
  onSuccess?: (msg: string) => void;
}

export function ManageRecurringModal({
  isOpen,
  onClose,
  accounts,
  categories,
  recurringCommitments,
  onSuccess,
}: ManageRecurringModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<RecurringCommitmentType>('emi');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalInstallmentsStr, setTotalInstallmentsStr] = useState('');
  const [paidInstallmentsStr, setPaidInstallmentsStr] = useState('0');
  const [isReservedCommitment, setIsReservedCommitment] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0) {
      setError('Please enter a valid commitment amount.');
      return;
    }
    if (!name.trim()) {
      setError('Commitment name is required.');
      return;
    }

    const totalInstallments = totalInstallmentsStr
      ? parseInt(totalInstallmentsStr)
      : undefined;
    const paidInstallments = parseInt(paidInstallmentsStr) || 0;
    const remainingCount = totalInstallments
      ? Math.max(0, totalInstallments - paidInstallments)
      : undefined;
    const remainingAmount =
      remainingCount !== undefined ? remainingCount * amount : undefined;

    try {
      const newCommitment: RecurringCommitment = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        type,
        amount,
        accountId,
        categoryId,
        frequency: 'monthly',
        dayOfMonth: parseInt(dayOfMonth) || 1,
        startDate,
        totalInstallments,
        paidInstallments,
        remainingAmount,
        isReservedCommitment,
        isActive: true,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.recurringCommitments.add(newCommitment);
      if (onSuccess) onSuccess(`Recurring commitment "${newCommitment.name}" added.`);
      setName('');
      setAmountStr('');
      setTotalInstallmentsStr('');
      setPaidInstallmentsStr('0');
      setNotes('');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save commitment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">
                Duration-Aware Recurring Commitments
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage EMIs (e.g. 6 months), Recurring Deposits (24 months), and ongoing PG Rent
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

        <div className="p-5 overflow-y-auto space-y-6">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSave}
            className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-bold uppercase tracking-wider text-violet-400 block">
              Add New Commitment
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Commitment Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Phone EMI (6M), Canara RD, PG Rent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Commitment Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RecurringCommitmentType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="emi">EMI / Debt Repayment (Duration-bound)</option>
                  <option value="recurring_investment">Recurring Deposit / Investment</option>
                  <option value="recurring_expense">Ongoing Expense (Rent, Internet)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Monthly Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="2499.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Deducted From Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Day of Month (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {type !== 'recurring_expense' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Total Installments (e.g. 6 for EMI, 24 for RD)
                    </label>
                    <input
                      type="number"
                      placeholder="6"
                      value={totalInstallmentsStr}
                      onChange={(e) => setTotalInstallmentsStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Already Paid Installments
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paidInstallmentsStr}
                      onChange={(e) => setPaidInstallmentsStr(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., OnePlus 12 EMI on HDFC"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isReservedCommitment}
                  onChange={(e) => setIsReservedCommitment(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700"
                />
                <span>Reserve in &quot;Available to Spend&quot; calculation</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Save Commitment</span>
              </button>
            </div>
          </form>

          {/* Existing Commitments */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Existing Commitments ({recurringCommitments.length})
            </h3>
            <div className="space-y-2">
              {recurringCommitments.map((comm) => (
                <div
                  key={comm.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{comm.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        {comm.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatINR(comm.amount)}/month on day {comm.dayOfMonth}
                      {comm.totalInstallments &&
                        ` • ${comm.paidInstallments}/${comm.totalInstallments} paid`}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await db.recurringCommitments.update(comm.id, {
                        isActive: !comm.isActive,
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      comm.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {comm.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
