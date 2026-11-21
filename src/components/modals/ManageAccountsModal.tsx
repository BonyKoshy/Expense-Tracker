import { useState } from 'react';
import { X, Plus, CreditCard, Landmark, Wallet, Banknote, Edit2, Archive, Trash2 } from 'lucide-react';
import type { Account, AccountType } from '@/types';
import { db, safeDeleteAccount } from '@/db';
import { formatINR } from '@/utils/formatters';

interface ManageAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess?: (msg: string) => void;
}

export function ManageAccountsModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: ManageAccountsModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balanceStr, setBalanceStr] = useState('');
  const [creditLimitStr, setCreditLimitStr] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('15');
  const [paymentDueDay, setPaymentDueDay] = useState('5');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#1a2536');
  const [isArchived, setIsArchived] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setBalanceStr(acc.balance.toString());
    setCreditLimitStr(acc.creditLimit ? acc.creditLimit.toString() : '');
    setBillingCycleDay(acc.billingCycleDay ? acc.billingCycleDay.toString() : '15');
    setPaymentDueDay(acc.paymentDueDay ? acc.paymentDueDay.toString() : '5');
    setInstitution(acc.institution || '');
    setAccountNumber(acc.accountNumber || '');
    setColor(acc.color || '#1a2536');
    setIsArchived(acc.isArchived || false);
    setIsDefault(acc.isDefault || false);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setType('bank');
    setBalanceStr('');
    setCreditLimitStr('');
    setBillingCycleDay('15');
    setPaymentDueDay('5');
    setInstitution('');
    setAccountNumber('');
    setColor('#1a2536');
    setIsArchived(false);
    setIsDefault(false);
    setError(null);
  };

  const handleDelete = async (acc: Account) => {
    try {
      const sourceCount = await db.transactions.where('accountId').equals(acc.id).count();
      const destCount = await db.transactions.where('toAccountId').equals(acc.id).count();
      const txCount = sourceCount + destCount;

      if (txCount > 0) {
        const archiveChoice = window.confirm(
          `Account "${acc.name}" has ${txCount} transaction(s) associated with it.\n\n` +
          `Would you like to ARCHIVE this account instead?\n\n` +
          `• Click OK to Archive (recommended: keeps transaction history and splits intact)\n` +
          `• Click Cancel to choose permanent deletion with transaction reversal`
        );

        if (archiveChoice) {
          await safeDeleteAccount(db, acc.id, 'archive');
          if (editingId === acc.id) resetForm();
          if (onSuccess) onSuccess(`Account "${acc.name}" archived successfully.`);
          return;
        }

        const forceChoice = window.confirm(
          `PERMANENT DELETION WARNING:\n\n` +
          `Permanently deleting "${acc.name}" will REVERT all ${txCount} transaction(s), reversing any shared split debts with friends and linked account transfers.\n\n` +
          `Are you sure you want to proceed with permanent deletion and reversal?`
        );

        if (forceChoice) {
          const res = await safeDeleteAccount(db, acc.id, 'cascade_revert');
          if (editingId === acc.id) resetForm();
          if (onSuccess) onSuccess(`Account "${acc.name}" deleted and ${res.transactionsReverted} transaction(s) reverted.`);
        }
      } else {
        if (window.confirm(`Are you sure you want to delete account "${acc.name}"?`)) {
          await safeDeleteAccount(db, acc.id, 'cascade_revert');
          if (editingId === acc.id) resetForm();
          if (onSuccess) onSuccess(`Account "${acc.name}" deleted.`);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter an account name.');
      return;
    }

    const balance = parseFloat(balanceStr) || 0;
    const creditLimit = creditLimitStr ? parseFloat(creditLimitStr) : undefined;

    try {
      if (editingId) {
        await db.accounts.update(editingId, {
          name: name.trim(),
          type,
          balance,
          creditLimit,
          billingCycleDay: parseInt(billingCycleDay) || undefined,
          paymentDueDay: parseInt(paymentDueDay) || undefined,
          institution: institution.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          color,
          isArchived,
          isDefault,
          updatedAt: new Date().toISOString(),
        });
        if (onSuccess) onSuccess(`Account "${name}" updated.`);
      } else {
        const newAccount: Account = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.trim(),
          type,
          balance,
          creditLimit,
          billingCycleDay: parseInt(billingCycleDay) || undefined,
          paymentDueDay: parseInt(paymentDueDay) || undefined,
          currency: 'INR',
          color,
          icon:
            type === 'credit_card'
              ? 'CreditCard'
              : type === 'cash'
              ? 'Banknote'
              : type === 'wallet'
              ? 'Wallet'
              : 'Landmark',
          isArchived: false,
          isDefault,
          institution: institution.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.accounts.add(newAccount);
        if (onSuccess) onSuccess(`New account "${name}" created.`);
      }
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save account');
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
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#e2e2e7] m-0">
                Accounts &amp; Cards
              </h2>
              <p className="text-xs text-[#90929d] mt-0.5">
                Bank balances, limits, and settlement sources
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

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Form */}
          <form
            onSubmit={handleSave}
            className="bg-[#111216] border border-[#23252c] rounded-[24px] p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#a8c7fa]">
                {editingId ? 'Edit Account' : 'Add New Account'}
              </span>
              {editingId && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const acc = accounts.find((a) => a.id === editingId);
                      if (acc) handleDelete(acc);
                    }}
                    className="text-xs text-[#f2b8b5] hover:text-[#ffb4ab] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-[#90929d] hover:text-[#e2e2e7]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-[#2b1b1d] border border-[#48282b] text-[#f2b8b5] text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HDFC Salary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Account Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                >
                  <option value="bank">Bank Account</option>
                  <option value="credit_card">Credit Card (Liability)</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="cash">Cash</option>
                  <option value="investment">Investment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  {type === 'credit_card' ? 'Current Liability (₹)' : 'Balance (₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balanceStr}
                  onChange={(e) => setBalanceStr(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] font-mono focus:outline-none"
                />
              </div>

              {type === 'credit_card' && (
                <div>
                  <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100000"
                    value={creditLimitStr}
                    onChange={(e) => setCreditLimitStr(e.target.value)}
                    className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] font-mono focus:outline-none"
                  />
                </div>
              )}

              {type === 'credit_card' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Statement Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={billingCycleDay}
                      onChange={(e) => setBillingCycleDay(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                      Payment Due Day (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                      className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g., HDFC Bank"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#c4c6cf] block mb-1">
                  Masked Number
                </label>
                <input
                  type="text"
                  placeholder="••4321"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-[#111216] border border-[#23252c] focus:border-[#a8c7fa] rounded-2xl px-3.5 py-2 text-xs text-[#e2e2e7] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c4c6cf]">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-[#23252c] text-[#a8c7fa] bg-[#111216]"
                />
                <span>Set as primary default</span>
              </label>

              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#003062] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>{editingId ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </form>

          {/* Accounts List */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-[#90929d] mb-2">
              Configured Accounts ({accounts.length})
            </h3>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-2xl bg-[#111216] border border-[#23252c] flex items-center justify-between hover:bg-[#1a1c22]/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#1a1c22] text-[#a8c7fa]">
                    {acc.type === 'credit_card' ? (
                      <CreditCard className="h-4 w-4" />
                    ) : acc.type === 'cash' ? (
                      <Banknote className="h-4 w-4" />
                    ) : acc.type === 'wallet' ? (
                      <Wallet className="h-4 w-4" />
                    ) : (
                      <Landmark className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#e2e2e7]">
                        {acc.name}
                      </span>
                      {acc.isDefault && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#1a2536] text-[#d3e3fd]">
                          Default
                        </span>
                      )}
                      {acc.isArchived && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#1a1c22] text-[#90929d]">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#90929d]">
                      {acc.institution || acc.type} • Balance: {formatINR(acc.balance)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(acc)}
                    className="p-1.5 text-[#90929d] hover:text-[#e2e2e7] rounded-full hover:bg-[#1a1c22] transition-colors"
                    title="Edit account"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await db.accounts.update(acc.id, {
                        isArchived: !acc.isArchived,
                      });
                    }}
                    className="p-1.5 text-[#90929d] hover:text-[#e2e2e7] rounded-full hover:bg-[#1a1c22] transition-colors"
                    title={acc.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(acc)}
                    className="p-1.5 text-[#90929d] hover:text-[#f2b8b5] rounded-full hover:bg-[#1a1c22] transition-colors"
                    title="Delete account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
