import { useState } from 'react';
import { X, Plus, Repeat, Trash2 } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (comm: RecurringCommitment) => {
    try {
      await db.recurringCommitments.delete(comm.id);
      if (onSuccess) onSuccess(`Recurring commitment "${comm.name}" deleted.`);
      setDeletingId(null);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete commitment');
    }
  };

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#16171c] border border-[#23252c] rounded-t-[28px] sm:rounded-[28px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150">
        <div className="w-10 h-1 rounded-full bg-[#23252c] mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#23252c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#1a1c22] text-[#a8c7fa] border border-[#262830]">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                Recurring Commitments
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                EMIs, duration-bound RDs, and rent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#c4c6cf] hover:text-[#e2e2e7] hover:bg-[#1a1c22] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSave}
            className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
          >
            <span className="text-xs font-semibold text-[#a8c7fa] block">
              Add New Commitment
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RecurringCommitmentType)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                >
                  <option value="emi">EMI (Duration-bound)</option>
                  <option value="recurring_investment">Recurring Deposit (RD)</option>
                  <option value="recurring_expense">Ongoing Expense (Rent, Internet)</option>
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Monthly Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] font-mono focus:outline-none min-h-[46px]"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Deducted From Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Due Day of Month (1-31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                />
              </div>

              {type !== 'recurring_expense' && (
                <>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                      Total Installments
                    </label>
                    <input
                      type="number"
                      placeholder="Total"
                      value={totalInstallmentsStr}
                      onChange={(e) => setTotalInstallmentsStr(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                      Paid Installments
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paidInstallmentsStr}
                      onChange={(e) => setPaidInstallmentsStr(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] focus:outline-none min-h-[46px]"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-sm font-medium text-[#c4c6cf] block mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-4 py-3 text-sm text-[#e2e2e7] placeholder-[#90929d] focus:outline-none min-h-[46px]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c4c6cf]">
                <input
                  type="checkbox"
                  checked={isReservedCommitment}
                  onChange={(e) => setIsReservedCommitment(e.target.checked)}
                  className="rounded border-[#23252c] text-[#a8c7fa] bg-[#111216]"
                />
                <span>Reserve in &quot;Available to Spend&quot;</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          </form>

          {/* Commitments List */}
          <div className="space-y-2">
            {recurringCommitments.map((comm) => (
              <div
                key={comm.id}
                className="p-3 rounded-2xl bg-[#111216] border border-[#23252c] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#e2e2e7]">{comm.name}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1a2536] text-[#d3e3fd]">
                      {comm.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-[#90929d] mt-0.5">
                    {formatINR(comm.amount)}/mo on day {comm.dayOfMonth}
                    {comm.totalInstallments &&
                      ` • ${comm.paidInstallments}/${comm.totalInstallments} paid`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await db.recurringCommitments.update(comm.id, {
                        isActive: !comm.isActive,
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      comm.isActive
                        ? 'bg-[#15241b] text-[#a8dab5] border border-[#22382a]'
                        : 'bg-[#1a1c22] text-[#90929d]'
                    }`}
                  >
                    {comm.isActive ? 'Active' : 'Paused'}
                  </button>

                  {deletingId === comm.id ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() => handleDelete(comm)}
                        className="px-2.5 py-1 rounded-full bg-[#3d1a1d] text-[#f2b8b5] border border-[#5c2429] hover:bg-[#522026] text-xs font-semibold transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="px-2 py-1 rounded-full bg-[#1a1c22] text-[#c4c6cf] hover:bg-[#23252c] text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(comm.id)}
                      className="p-1.5 rounded-xl text-[#90929d] hover:text-[#f2b8b5] hover:bg-[#2b1b1d] transition-colors"
                      title="Delete commitment"
                      aria-label={`Delete ${comm.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
